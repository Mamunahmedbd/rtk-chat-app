import { io } from "socket.io-client";
import { apiSlice } from "../api/apiSlice";

export const messagesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query({
      query: (id) =>
        `/messages?conversationId=${id}&_sort=timestamp&_order=desc&_page=1&_limit=${process.env.REACT_APP_MESSAGES_PER_PAGE}`,
      transformResponse(apiResponse, meta) {
        const totalCount = meta.response.headers.get("X-Total-Count");
        return { data: apiResponse, totalCount };
      },
      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        // create socket
        const socket = io("http://localhost:9000", {
          reconnectionDelay: 1000,
          reconnection: true,
          reconnectionAttemps: 10,
          transports: ["websocket"],
          agent: false,
          upgrade: false,
          rejectUnauthorized: false,
        });

        try {
          await cacheDataLoaded;
          socket.on("message", (data) => {
            updateCachedData((draft) => {
              console.log(`this is socket data ${JSON.stringify(data?.data)}`);
              console.log(`this is socket data ${JSON.stringify(draft?.data)}`);
              // console.log(
              //   `this is socket data ${JSON.stringify(mgsData?.data)}`
              // );
              // const foundMsg = draft.data.findIndex(
              //   (msg) => msg.timestamp == data?.data?.timestamp
              // );
              // if (foundMsg === -1) draft.data.push(data?.data);
              const message = draft.data.find(
                (c) => c.id == data?.data?.id.toString()
              );
              if (message?.id) {
                draft.data.push(data?.data);
              }
            });
          });
        } catch (err) {}

        await cacheEntryRemoved;
        socket.close();
      },
    }),
    addMessage: builder.mutation({
      query: (data) => ({
        url: "/messages",
        method: "POST",
        body: data,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        // console.log(arg);
        try {
          const message = await queryFulfilled;
          console.log(`Add mgs data ${JSON.stringify(message?.data)}`);
          if (message?.data?.id) {
            dispatch(
              apiSlice.util.updateQueryData(
                "getMessages",
                message?.data?.conversationId.toString(),
                (draft) => {
                  draft.dat.push(message?.data);
                  console.log(`Add mgs draft data ${JSON.stringify(draft)}`);
                }
              )
            );
          }
        } catch (err) {
          console.log(err);
        }
      },
    }),
  }),
});

export const { useGetMessagesQuery, useAddMessageMutation } = messagesApi;
