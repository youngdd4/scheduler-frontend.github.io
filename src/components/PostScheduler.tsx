import React, { useState } from 'react';
import './PostScheduler.css';

interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime: Date;
  mediaUrl?: string;
  status: 'scheduled' | 'posted' | 'failed';
}

const PostScheduler: React.FC = () => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPostContent || !scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // In a real app, we would call an API to schedule the post
      // For now, we're just adding it to local state
      const newPost: ScheduledPost = {
        id: Date.now().toString(),
        content: newPostContent,
        scheduledTime: new Date(scheduledTime),
        mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : undefined,
        status: 'scheduled'
      };

      setScheduledPosts([...scheduledPosts, newPost]);
      
      // Clear form
      setNewPostContent('');
      setScheduledTime('');
      setMediaFile(null);
      
      console.log('Post scheduled:', newPost);
    } catch (error) {
      console.error('Failed to schedule post:', error);
      alert('Failed to schedule post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setMediaFile(e.target.files[0]);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="post-scheduler">
      <h2>Schedule TikTok Posts</h2>
      
      <form onSubmit={handleSchedulePost} className="schedule-form">
        <div className="form-group">
          <label htmlFor="post-content">Post Content</label>
          <textarea
            id="post-content"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Enter your post caption or description"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="scheduled-time">Schedule Time</label>
          <input
            id="scheduled-time"
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="media-file">Upload Media (Video/Image)</label>
          <input
            id="media-file"
            type="file"
            accept="video/*,image/*"
            onChange={handleFileChange}
          />
          {mediaFile && (
            <div className="media-preview">
              <p>Selected file: {mediaFile.name}</p>
            </div>
          )}
        </div>
      </form>
      
      <div className="scheduled-posts">
        <h3>Scheduled Posts</h3>
        {scheduledPosts.length === 0 ? (
          <p className="no-posts">No posts scheduled yet</p>
        ) : (
          <ul className="post-list">
            {scheduledPosts.map((post) => (
              <li key={post.id} className={`post-item status-${post.status}`}>
                <div className="post-content">{post.content}</div>
                <div className="post-time">
                  Scheduled for: {formatDate(post.scheduledTime)}
                </div>
                <div className="post-status">Status: {post.status}</div>
                {post.mediaUrl && (
                  <div className="post-media">
                    <img src={post.mediaUrl} alt="Post media preview" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PostScheduler; 