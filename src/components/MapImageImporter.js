// ============================================================
// MAPIMAGEIMPORTER.JS — Torchlight Combat
// Lets the DM import an image as a background layer on the battle map
// Supports: jpg, png, webp, gif, svg
// Stored in IndexedDB so it persists across refreshes
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================
// INDEXEDDB HELPERS FOR IMAGE STORAGE
// Separate from session storage — image can be large
// ============================================================
const IMG_DB_NAME    = 'torchlight-mapimage';
const IMG_DB_VERSION = 1;
const IMG_STORE      = 'image';

const openImgDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(IMG_DB_NAME, IMG_DB_VERSION);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(IMG_STORE)) {
      db.createObjectStore(IMG_STORE, { keyPath: 'key' });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror   = () => reject(req.error);
});

const saveImageToDB = async (data) => {
  const db = await openImgDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(IMG_STORE, 'readwrite');
    const store = tx.objectStore(IMG_STORE);
    store.put({ key: 'mapbg', ...data });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
};

const loadImageFromDB = async () => {
  const db = await openImgDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(IMG_STORE, 'readonly');
    const store = tx.objectStore(IMG_STORE);
    const req   = store.get('mapbg');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  });
};

const clearImageFromDB = async () => {
  const db = await openImgDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(IMG_STORE, 'readwrite');
    const store = tx.objectStore(IMG_STORE);
    store.delete('mapbg');
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
};


// ============================================================
// MAP IMAGE IMPORTER COMPONENT
// ============================================================
function MapImageImporter({ isOpen, onClose, onImageSet, onImageClear, currentImage }) {

  // ---- Preview image data URL ----
  const [previewSrc, setPreviewSrc]   = useState(null);

  // ---- Scale: percentage 10–300 ----
  const [scale, setScale]             = useState(100);

  // ---- Position: x and y offset in pixels ----
  const [posX, setPosX]               = useState(0);
  const [posY, setPosY]               = useState(0);

  // ---- Drag state for repositioning in preview ----
  const isDragging                    = useRef(false);
  const dragStart                     = useRef({ x: 0, y: 0 });

  // ---- File input ref ----
  const fileInputRef                  = useRef(null);


  // ---- Pre-fill from current image when modal opens ----
  useEffect(() => {
    if (isOpen && currentImage) {
      setPreviewSrc(currentImage.src);
      setScale(currentImage.scale || 100);
      setPosX(currentImage.posX || 0);
      setPosY(currentImage.posY || 0);
    }
    if (isOpen && !currentImage) {
      setPreviewSrc(null);
      setScale(100);
      setPosX(0);
      setPosY(0);
    }
  }, [isOpen, currentImage]);


  // ============================================================
  // HANDLE FILE SELECTION
  // ============================================================
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewSrc(ev.target.result);
      setScale(100);
      setPosX(0);
      setPosY(0);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  // ============================================================
  // DRAG TO REPOSITION IN PREVIEW
  // ============================================================
  const handlePreviewMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current  = { x: e.clientX - posX, y: e.clientY - posY };
    e.preventDefault();
  };

  const handlePreviewMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    setPosX(e.clientX - dragStart.current.x);
    setPosY(e.clientY - dragStart.current.y);
  }, []);

  const handlePreviewMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('mousemove', handlePreviewMouseMove);
      window.addEventListener('mouseup',   handlePreviewMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePreviewMouseMove);
      window.removeEventListener('mouseup',   handlePreviewMouseUp);
    };
  }, [isOpen, handlePreviewMouseMove, handlePreviewMouseUp]);


  // ============================================================
  // CONFIRM — save image to IndexedDB and pass to parent
  // ============================================================
  const handleConfirm = async () => {
    if (!previewSrc) return;

    const imageData = { src: previewSrc, scale, posX, posY };

    try {
      await saveImageToDB(imageData);
      onImageSet(imageData);
      onClose();
    } catch (err) {
      console.error('Failed to save image:', err);
    }
  };


  // ============================================================
  // CLEAR — remove image from IndexedDB and parent
  // ============================================================
  const handleClear = async () => {
    try {
      await clearImageFromDB();
      onImageClear();
      setPreviewSrc(null);
      onClose();
    } catch (err) {
      console.error('Failed to clear image:', err);
    }
  };


  // ---- Don't render if closed ----
  if (!isOpen) return null;


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {/* ---- Backdrop ---- */}
      <div className="imgimport-backdrop" onClick={onClose} />

      {/* ---- Modal ---- */}
      <div className="imgimport-modal">

        {/* Header */}
        <div className="imgimport-header">
          <span className="imgimport-title">🖼 Map Background Image</span>
          <button className="imgimport-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="imgimport-body">

          {/* ---- File picker ---- */}
          <div className="imgimport-pick-row">
            <button
              className="imgimport-pick-btn"
              onClick={() => fileInputRef.current.click()}
            >
              📁 Choose Image
            </button>
            <span className="imgimport-pick-note">
              jpg, png, webp, gif, svg
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {currentImage && (
              <button className="imgimport-clear-btn" onClick={handleClear}>
                ✕ Remove current
              </button>
            )}
          </div>

          {/* ---- Preview area ---- */}
          {previewSrc ? (
            <>
              <div className="imgimport-preview-wrap">
                <div className="imgimport-preview-label">
                  Drag to reposition · Use slider to scale
                </div>
                <div
                  className="imgimport-preview"
                  onMouseDown={handlePreviewMouseDown}
                >
                  {/* Grid overlay so DM can align image to grid */}
                  <div className="imgimport-grid-overlay" />

                  {/* The image */}
                  <img
                    src={previewSrc}
                    alt="Map background preview"
                    className="imgimport-preview-img"
                    style={{
                      transform: `translate(${posX}px, ${posY}px) scale(${scale / 100})`,
                      transformOrigin: 'top left',
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              {/* Scale slider */}
              <div className="imgimport-scale-row">
                <label className="imgimport-scale-label">
                  Scale: <strong>{scale}%</strong>
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={scale}
                  onChange={e => setScale(parseInt(e.target.value))}
                  className="imgimport-slider"
                />
              </div>

              {/* Position reset */}
              <button
                className="imgimport-reset-btn"
                onClick={() => { setPosX(0); setPosY(0); setScale(100); }}
              >
                ↺ Reset position & scale
              </button>
            </>
          ) : (
            <div className="imgimport-empty">
              <div className="imgimport-empty-icon">🖼</div>
              <div>No image selected</div>
              <div className="imgimport-empty-sub">
                Pick an image to use as a background layer under the grid.
                Tokens and terrain paint on top of it.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="imgimport-footer">
          <button className="imgimport-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          {previewSrc && (
            <button className="imgimport-confirm-btn" onClick={handleConfirm}>
              ✓ Apply to map
            </button>
          )}
        </div>

      </div>
    </>
  );
}


// ============================================================
// EXPORT HOOK — load saved image on app start
// Call this in BattleMap to restore image from IndexedDB
// ============================================================
export const useMapImage = () => {
  const [mapImage, setMapImage] = useState(null);

  useEffect(() => {
    loadImageFromDB().then(data => {
      if (data) setMapImage(data);
    }).catch(() => {});
  }, []);

  return [mapImage, setMapImage];
};

export default MapImageImporter;