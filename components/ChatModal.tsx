
import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, XCircle, Send, Bot } from 'lucide-react';
import { ChatMessage } from '../types';
import { ASCII_COLORS } from '../constants';

interface ChatModalProps {
  show: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isGeminiLoading: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({ show, onClose, chatHistory, onSendMessage, isGeminiLoading }) => {
  const [chatInput, setChatInput] = useState("");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isGeminiLoading]);

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isGeminiLoading) {
      onSendMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const getDisplayableTextFromParts = (parts: ChatMessage['parts']): string => {
    let text = "";
    if (parts && parts.length > 0) {
      const firstPart = parts[0];
      if (firstPart.text) {
        text = firstPart.text;
      } else if (firstPart.functionCall) {
        text = `[AI is trying to use tool: ${firstPart.functionCall.name} with args: ${JSON.stringify(firstPart.functionCall.args)}]`;
      } else if (firstPart.functionResponse) {
        text = `[Tool ${firstPart.functionResponse.name} responded. Waiting for AI summary...]`;
      }
    }
    return text || "[[ Processing... ]]";
  };

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-4 rounded-lg shadow-xl w-full max-w-2xl border-2 ${ASCII_COLORS.border} h-[80vh] flex flex-col`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-xl font-bold ${ASCII_COLORS.accent} flex items-center`}>
            <BrainCircuit className="mr-2" />
            S.M.A.R.T.I.E. Assistant
          </h2>
          <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-full ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} border-opacity-50`}>
            <XCircle size={20}/>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 text-sm">
          {chatHistory.map((msg, index) => {
            // We only display user messages and model's text responses.
            // Function calls and responses are processed but not directly shown in this simple view.
            // Or, we can show a simplified text version like getDisplayableTextFromParts does.
            const messageText = getDisplayableTextFromParts(msg.parts);

            if (msg.role === 'function') { // Don't display function role messages directly, or style them differently
                 return (
                    <div key={index} className="flex items-start gap-3 justify-center">
                        <div className={`italic p-2 rounded-lg max-w-[80%] text-xs ${ASCII_COLORS.inputBg} opacity-70 border ${ASCII_COLORS.border} border-dashed`}>
                            {messageText}
                        </div>
                    </div>
                );
            }

            return (
              <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && (
                  <div className={`p-2 rounded-full ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border} self-start shrink-0`}>
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                <div className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? `ml-auto ${ASCII_COLORS.inputBg} border ${ASCII_COLORS.border}` : `${ASCII_COLORS.modalBg} border border-yellow-700`}`}>
                  {messageText}
                </div>
              </div>
            );
          })}
          {isGeminiLoading && (
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border} animate-pulse shrink-0`}>
                <Bot className="w-5 h-5" />
              </div>
              <div className={`p-3 rounded-lg ${ASCII_COLORS.modalBg} border border-yellow-700 animate-pulse`}>[[ PROCESSING... ]]</div>
            </div>
          )}
          <div ref={chatMessagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Ask S.M.A.R.T.I.E..."
            className={`flex-grow p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} placeholder-gray-500`}
            disabled={isGeminiLoading}
            autoFocus
          />
          <button
            type="submit"
            className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-4 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
            disabled={isGeminiLoading}
          >
            <Send />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;