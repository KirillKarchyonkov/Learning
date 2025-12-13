import React from 'react';

const VideoEmbed = ({ url }) => {
  const getEmbedUrl = (url) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId[1]}`;
      }
    }
    // VK
    if (url.includes('vk.com')) {
      const match = url.match(/video-?\d+_\d+/);
      if (match) {
        return `https://vk.com/video_ext.php?oid=${match[0].split('_')[0]}&id=${match[0].split('_')[1]}&hash=`;
      }
    }
    return url;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="video-embed">
      <iframe
        src={embedUrl}
        title="Video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

export default VideoEmbed;