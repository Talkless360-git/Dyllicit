"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, MessageCircle, Send } from "lucide-react";
import Button from "@/components/ui/Button";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { name?: string; email?: string; image?: string; address?: string; };
}

export default function MediaInteractions({ mediaId, initialLikes, initialPlayCount }: { mediaId: string, initialLikes: number, initialPlayCount: number }) {
  const { data: session } = useSession();
  
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch(`/api/interactions/comment?mediaId=${mediaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.comments) setComments(data.comments);
      });
  }, [mediaId]);

  const toggleLike = async () => {
    if (!session) return alert("Sign in to like");
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    
    await fetch("/api/interactions/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId })
    });
  };

  const postComment = async () => {
    if (!session) return alert("Sign in to comment");
    if (!newComment.trim()) return;

    const res = await fetch("/api/interactions/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, content: newComment })
    });
    
    const data = await res.json();
    if (data.success) {
      setComments([data.comment, ...comments]);
      setNewComment("");
    }
  };

  return (
    <div className="media-interactions">
      <div className="stats-bar">
        <span>🎧 {initialPlayCount} plays</span>
        <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
          <Heart fill={liked ? "currentColor" : "none"} size={20} />
          {likesCount} Likes
        </button>
      </div>

      <div className="comments-section">
        <h3><MessageCircle size={20} /> Comments ({comments.length})</h3>
        
        {session && (
          <div className="comment-input-area">
            <input 
              type="text" 
              placeholder="Add a comment..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && postComment()}
            />
            <Button variant="primary" size="sm" onClick={postComment}><Send size={16} /></Button>
          </div>
        )}

        <div className="comments-list">
          {comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">{c.user.name?.[0] || c.user.email?.[0] || "?"}</div>
              <div className="comment-body">
                <strong>{c.user.name || c.user.email?.split("@")[0] || "User"}</strong>
                <p>{c.content}</p>
                <small>{new Date(c.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .media-interactions {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .stats-bar {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          color: rgba(255,255,255,0.7);
        }
        .action-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
          transition: 0.2s;
        }
        .action-btn:hover { color: white; }
        .action-btn.liked { color: #ff007a; }
        
        .comments-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .comment-input-area {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .comment-input-area input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          color: white;
          outline: none;
        }
        .comment-input-area input:focus { border-color: var(--primary); }
        
        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .comment-item {
          display: flex;
          gap: 1rem;
        }
        .comment-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          text-transform: uppercase;
        }
        .comment-body strong { display: block; margin-bottom: 0.25rem; }
        .comment-body p { margin: 0; color: rgba(255,255,255,0.8); }
        .comment-body small { color: rgba(255,255,255,0.4); font-size: 0.8rem; }
      `}</style>
    </div>
  );
}
