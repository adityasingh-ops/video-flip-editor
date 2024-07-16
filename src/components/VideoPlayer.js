import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactPlayer from 'react-player';
import Cropper from './Cropper';
import Preview from './Preview';

const aspectRatios = {
  '9:18': 9 / 18,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '1:1': 1,
  '4:5': 4 / 5
};

const VideoPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [cropperData, setCropperData] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [isRecording, setIsRecording] = useState(false);

  const [recordedSessions, setRecordedSessions] = useState([]);
  const [recordedChunks, setRecordedChunks] = useState([]); 

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const updateCropperData = useCallback((data) => {
    setCropperData(data);
    if (isRecording && canvasRef.current) {
      canvasRef.current.width = data.width;
      canvasRef.current.height = data.height;
    }
    if (isRecording) {
      setRecordedSessions(prev => [...prev, {
        timeStamp: videoRef.current.getCurrentTime(),
        coordinates: [data.x, data.y, data.width, data.height],
        volume: volume,
        playbackRate: playbackRate
      }]);
    }
  }, [volume, playbackRate, isRecording]);

  const handleProgress = useCallback((state) => {
    setCurrentTime(state.playedSeconds);
  }, []);

  const handleDuration = useCallback((duration) => {
    setDuration(duration);
  }, []);

  

  const startRecording = () => {
    setIsRecording(true);
    setRecordedSessions([]);
    setRecordedChunks([]);
  
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current.getInternalPlayer();
  
    // Initial canvas size
    canvasRef.current.width = cropperData.width;
    canvasRef.current.height = cropperData.height;
  
    const stream = canvasRef.current.captureStream(30); // 30 fps
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' })
  
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };
  
    mediaRecorderRef.current.start();
  
    function drawFrame() {
      if (isRecording) {
        const scaleX = video.videoWidth / videoRef.current.wrapper.clientWidth;
        const scaleY = video.videoHeight / videoRef.current.wrapper.clientHeight;
  
        ctx.drawImage(
          video,
          cropperData.x * scaleX, cropperData.y * scaleY, 
          cropperData.width * scaleX, cropperData.height * scaleY,
          0, 0, canvasRef.current.width, canvasRef.current.height
        );
        requestAnimationFrame(drawFrame);
      }
    }
    drawFrame();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cropped_video.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setRecordedChunks([]);
  };

  const handleCancel = () => {
    // Reset the state to restart the session
    setPlaying(false);
    setVolume(0.8);
    setPlaybackRate(1.0);
    setAspectRatio('9:16');
    setCropperData({});
    setCurrentTime(0);
    setDuration(0);
    setShowCropper(false);
    setActiveTab('preview');
    setIsRecording(false);
    setRecordedSessions([]);
    videoRef.current.seekTo(0); // Seek the video to the beginning
  };
  
  const handleGenerateSession = () => {
    // Start the session by setting the active tab to "generate"
    setActiveTab('generate');
    startRecording();
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-editor-modal">
      <div className="editor-header">
        <h2>Cropper</h2>
        <div className="tab-buttons">
          <button
            className={activeTab === "preview" ? "active" : ""}
            onClick={() => setActiveTab("preview")}
          >
            Preview Session
          </button>
          <button
            className={activeTab === "generate" ? "active" : ""}
            onClick={() => setActiveTab("generate")}
          >
            Generate Session
          </button>
        </div>
      </div>
      <div className="editor-content">
        <div className="video-section">
          <div className="video-container" ref={playerContainerRef}>
            <ReactPlayer
              url="/videos/abc.mp4"
              playing={playing}
              volume={volume}
              playbackRate={playbackRate}
              width="100%"
              height="100%"
              ref={videoRef}
              onProgress={handleProgress}
              onDuration={handleDuration}
            />
            {showCropper && (
              <Cropper
                aspectRatio={aspectRatio}
                setCropperData={updateCropperData}
                containerRef={playerContainerRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            )}
          </div>
          <div className="controls">
            <div className="progress-bar">
              <button className='platbutton' onClick={() => setPlaying(!playing)}>
                {playing ? "⏸️" : "▶️"}
              </button>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => videoRef.current.seekTo(parseFloat(e.target.value))}
              />
            </div>
            <div className='secondline'>
              <div>{formatTime(currentTime)} / {formatTime(duration)}</div>
              <div>
                <button className='sound'>🔉</button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="control-buttons">
              <select
                className="playback-rate"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
              <select
                className="aspect-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {Object.keys(aspectRatios).map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="preview-section">
        <h3>{activeTab === "preview" ? "Preview" : "Generate Session"}</h3>
        <div className="preview-content">
          {activeTab === "preview" ? (
            showCropper ? (
              <Preview cropperData={cropperData} videoRef={videoRef} />
            ) : (
              <div className="preview-placeholder">
                <div className="preview-icon">▶️</div>
                <p>Preview not available</p>
                <p>Please click on "Start Cropper" and then play video</p>
              </div>
            )
          ) : (
            <div className="generate-session">
              <p>Record your cropping session</p>
              {!isRecording ? (
                <button onClick={startRecording}>Start Recording</button>
              ) : (
                <>
                  <button onClick={stopRecording}>Stop Recording</button>
                  <p>Recording in progress...</p>
                </>
              )}
              {recordedChunks.length > 0 && !isRecording && (
                <button onClick={saveRecording}>Save Recording</button>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      <div className="footer">
        <div className='button3'>
          <button
            className="start-cropper"
            onClick={() => setShowCropper(true)}
            disabled={showCropper}
          >
            Start Cropper
          </button>
          <button
            className="remove-cropper"
            onClick={() => setShowCropper(false)}
            disabled={!showCropper}
          >
            Remove Cropper
          </button>
          <button className="hug-hug" onClick={handleGenerateSession} >Generate Session</button>
        </div>
        <div>
          <button className="cancel" onClick={handleCancel}>Cancel</button>
        </div>
      </div>
      <style jsx global>{`
        body {
          background-color: #000000;
          font-family: 'Roboto', sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          color: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
      `}</style>
      <style jsx>{`
  .video-editor-modal {
    background-color: #2C2D30;
    color: white;
    padding: 20px;
    width: 1080px;
    height: 668px;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .editor-header h2 {
    margin: 0;
  }

  .tab-buttons {
    background-color: #45474E;
    border-radius: 6px;
    overflow: hidden;
  }

  .tab-buttons button {
    padding: 10px 20px;
    border: none;
    background-color: transparent;
    color: white;
    cursor: pointer;
  }

  .tab-buttons button.active {
    background-color: #37393F;
  }

  .editor-content {
    display: flex;
    flex: 1;
    gap: 20px;
    overflow: hidden;
  }

  .video-section {
    width: 460px;
    display: flex;
    flex-direction: column;
  }

  .video-container {
    position: relative;
    width: 100%;
  
    background-color: black;
    border-radius: 8px;
    overflow: hidden;
  }

  .controls {
    margin-top: 10px;
  }

  .platbutton {
    background-color: transparent;
    border: none;
    color: white;
    cursor: pointer;
  }

  .progress-bar {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .progress-bar input {
    flex: 1;
    margin: 0 10px;
  }

  .secondline {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sound {
    background-color: transparent;
    border: none;
    color: white;
    cursor: pointer;
  }

  .control-buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  }

 


  .playback-rate, .aspect-ratio {
    padding: 5px;
    border-radius: 6px;
    border: none;
    background-color: #37393F;
    color: white;
  }

  .preview-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #2C2D30;
    border-radius: 8px;
  }

  .preview-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .preview-placeholder {
    text-align: center;
    color: #888;
  }

  .preview-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #37393F;
  }

  .button3 {
    display: flex;
    gap: 10px;
  }

  .footer button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background-color: #6C5CE7;
    color: white;
  }

  .footer .cancel {
    background-color: transparent;
    border: 1px solid #6C5CE7;
  }
  .generate-session {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .generate-session button {
    margin-top: 10px;
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background-color: #6C5CE7;
    color: white;
  }

  .hug-hug {
    background-color: #37393F !important;
  }
`}</style>
    </div>
  );
};

export default VideoPlayer;