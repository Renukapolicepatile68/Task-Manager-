import { useState } from "react";
import { toast } from "sonner";
import { useGetSmartSuggestionsMutation, useGetChatResponseMutation } from "../redux/slices/api/aiApiSlice";
import Button from "./Button";
import Loading from "./Loading";

const AIInsights = ({ taskId }) => {
  const [activeTab, setActiveTab] = useState("suggestions");
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: taskId
        ? "This assistant can help with the current task, subtasks, priorities, and deadlines."
        : "Ask me anything about your tasks, deadlines, priorities, or team coordination.",
    },
  ]);

  const [getSuggestions, { isLoading: isSuggestionsLoading }] = useGetSmartSuggestionsMutation();
  const [getChatResponse, { isLoading: isChatLoading }] = useGetChatResponseMutation();

  const handleSuggestionSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("Type a question or request for the AI assistant.");
      return;
    }

    try {
      const res = await getSuggestions({ prompt, taskId }).unwrap();
      setSuggestions(res.suggestions);
    } catch (err) {
      toast.error(err?.data?.message || "Unable to fetch AI suggestions.");
    }
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) {
      toast.error("Type a message for the chat assistant.");
      return;
    }

    const userMessage = { role: "user", content: chatMessage.trim() };
    setChatHistory((prev) => [...prev, userMessage]);

    try {
      const res = await getChatResponse({ message: chatMessage, taskId }).unwrap();
      setChatHistory((prev) => [...prev, { role: "assistant", content: res.message }]);
      setChatMessage("");
    } catch (err) {
      toast.error(err?.data?.message || "Unable to get a chat response.");
    }
  };

  return (
    <div className='w-full bg-white dark:bg-[#1f1f1f] rounded-xl shadow-md p-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4'>
        <div>
          <h3 className='text-lg font-semibold text-gray-700 dark:text-gray-100'>AI Productivity Assistant</h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Ask for smart task suggestions, priority recommendations, and deadline predictions.</p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "suggestions"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
            onClick={() => setActiveTab("suggestions")}
          >
            Suggestions
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "chat"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
        </div>
      </div>

      {activeTab === "suggestions" ? (
        <>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ask the AI for suggestions, deadlines, or productivity advice...'
            className='w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-[#111111] dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-900/30'
          />

          <div className='mt-4 flex flex-wrap gap-3'>
            <Button
              label='Get Suggestions'
              onClick={handleSuggestionSubmit}
              className='bg-blue-600 text-white hover:bg-blue-700'
            />
          </div>

          <div className='mt-5'>
            {isSuggestionsLoading ? (
              <Loading />
            ) : suggestions ? (
              <div className='rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800 dark:border-gray-700 dark:bg-[#111111] dark:text-gray-100'>
                <p>{suggestions}</p>
              </div>
            ) : (
              <div className='rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400'>
                Enter a prompt and click "Get Suggestions" to receive AI-based task recommendations.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className='h-[320px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-[#111111] dark:text-gray-100'>
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`mb-4 rounded-2xl p-4 ${
                  message.role === "assistant"
                    ? "bg-gray-100 text-gray-900 dark:bg-[#1b1b1b] dark:text-gray-100"
                    : "bg-blue-600 text-white"
                }`}
              >
                <div className='mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  {message.role === "assistant" ? "Assistant" : "You"}
                </div>
                <div>{message.content}</div>
              </div>
            ))}
          </div>

          <textarea
            rows={4}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={
              taskId
                ? 'Ask the AI about this task, subtasks, deadlines or next actions...'
                : 'Ask the AI assistant a question...'
            }
            className='w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-[#111111] dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-900/30 mt-4'
          />

          <div className='mt-4 flex flex-wrap gap-3'>
            {isChatLoading ? (
              <Loading />
            ) : (
              <Button
                label='Send Message'
                onClick={handleChatSubmit}
                className='bg-blue-600 text-white hover:bg-blue-700'
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AIInsights;
