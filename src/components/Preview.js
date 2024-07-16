import React, { useRef, useEffect } from 'react';

const Preview = ({ cropperData, videoRef }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    const ctx = canvasRef.current.getContext('2d');

    const captureFrame = () => {
      if (videoRef.current && cropperData.width && cropperData.height) {
        const { videoWidth, videoHeight } = videoRef.current.getInternalPlayer();
        const scaleWidth = videoWidth / videoRef.current.wrapper.clientWidth;
        const scaleHeight = videoHeight / videoRef.current.wrapper.clientHeight;

        canvasRef.current.width = cropperData.width * scaleWidth;
        canvasRef.current.height = cropperData.height * scaleHeight;

        ctx.drawImage(
          videoRef.current.getInternalPlayer(),
          cropperData.x * scaleWidth,
          cropperData.y * scaleHeight,
          cropperData.width * scaleWidth,
          cropperData.height * scaleHeight,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
      animationFrameId = requestAnimationFrame(captureFrame);
    };

    captureFrame();

    return () => cancelAnimationFrame(animationFrameId);
  }, [cropperData, videoRef]);

  return (
    <div className="preview-container">
      <canvas ref={canvasRef} />
      <style jsx>{`
        .preview-container {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
};

export default Preview;