
import React from 'react';
import { Tag } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface TagDisplayProps {
  tags?: string[];
}

const TagDisplay: React.FC<TagDisplayProps> = ({ tags }) => {
  if (!tags || tags.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((tag, index) => (
        <span
          key={index}
          className={`${ASCII_COLORS.tagBg} text-xs px-2 py-0.5 rounded-full flex items-center`}
        >
          <Tag className="w-3 h-3 mr-1" />
          {tag}
        </span>
      ))}
    </div>
  );
};

export default TagDisplay;
