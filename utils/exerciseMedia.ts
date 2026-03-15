
/**
 * Utility to handle exercise media (images, youtube, vimeo)
 */
export const ExerciseMediaUtils = {
    /**
     * Extracts the video ID from a YouTube or Vimeo URL
     */
    getVideoId: (url: string, type: 'youtube' | 'vimeo'): string | null => {
        if (!url) return null;

        if (type === 'youtube') {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }

        if (type === 'vimeo') {
            const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
            const match = url.match(regExp);
            return match ? match[1] : null;
        }

        return null;
    },

    /**
     * Generates a thumbnail URL for the exercise
     */
    getThumbnail: (mediaUrl?: string, mediaType?: string): string | null => {
        if (!mediaUrl) return null;

        if (mediaType === 'image') return mediaUrl;

        if (mediaType === 'youtube') {
            const id = ExerciseMediaUtils.getVideoId(mediaUrl, 'youtube');
            if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        }

        if (mediaType === 'vimeo') {
            // Vimeo requires an API call for thumbnails usually, but we can try to guess or use a placeholder
            // For now, let's just use the URL if it's an image or return null to use the icon
            return null;
        }

        return null;
    },

    /**
     * Generates an embed URL for iframes
     */
    getEmbedUrl: (mediaUrl: string, mediaType: string): string | null => {
        if (!mediaUrl) return null;

        if (mediaType === 'youtube') {
            const id = ExerciseMediaUtils.getVideoId(mediaUrl, 'youtube');
            return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
        }

        if (mediaType === 'vimeo') {
            const id = ExerciseMediaUtils.getVideoId(mediaUrl, 'vimeo');
            return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
        }

        return null;
    }
};
