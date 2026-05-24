import { apiSlice } from "../apiSlice";

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSmartSuggestions: builder.mutation({
      query: (data) => ({
        url: `/ai/suggestions`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),
    getChatResponse: builder.mutation({
      query: (data) => ({
        url: `/ai/chat`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),
  }),
});

export const { useGetSmartSuggestionsMutation, useGetChatResponseMutation } = aiApiSlice;
