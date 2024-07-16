export const generateJSON = (recordedData) => {
    return JSON.stringify(recordedData, null, 2);
  };
  
  export const downloadJSON = (jsonData) => {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video_edit_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  