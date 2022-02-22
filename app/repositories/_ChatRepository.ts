// import { v4 } from 'uuid';
// import { currentTimeMs } from '../utils';

// export default class ChatRepository {
//   public static readonly MESSAGES_PER_PAGE = 40;

//   constructor(private conn: any) {}

//   // CHATS

//   async getChatsById(chatIds: string[]) {
//     if (!chatIds || 0 === chatIds.length) return [];

//     const query = `
//       SELECT * FROM chats WHERE id IN (${chatIds.map((_, ix) => `$${ix + 1}`)}) ORDER BY last_message_at DESC
//     `;
//     const result = await this.conn.query(query, chatIds);

//     return result.rows;
//   }

//   async createChat(memberOneId: string, memberTwoId: string) {
//     const chatId = v4();

//     const query = `
//     INSERT INTO chats (id, member_one_id, member_two_id, last_message_at, created_at) VALUES ($1, $2, $3, $4, $5)
//     `;

//     await this.conn.query(query, [chatId, memberOneId, memberTwoId, null, currentTimeMs()]);

//     return chatId;
//   }

//   async updateLastChatMessage(chatId: string, timestamp: number, messageId: string) {
//     const query = 'UPDATE chats SET last_message_at = $1, last_message_id = $2 WHERE id = $3';

//     await this.conn.query(query, [timestamp, messageId, chatId]);

//     return chatId;
//   }

//   async updateNotSeenCount(chatId: string, userId: string) {
//     const query = `
//     INSERT INTO not_seen_chat_messages_count (chat_id, user_id, not_seen_count)
//        VALUES ($1, $2, 1)
//        ON CONFLICT (chat_id, user_id)
//        DO UPDATE SET not_seen_count = not_seen_chat_messages_count.not_seen_count + 1
//     `;
//     // const query = 'UPDATE not_seen_chat_messages_count SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND user_id = $2';

//     await this.conn.query(query, [chatId, userId]);

//     return chatId;
//   }

//   async seeChat(chatId: string, userId: string) {
//     const query = 'UPDATE not_seen_chat_messages_count SET not_seen_count = 0 WHERE chat_id = $1 AND user_id = $2';
//     // const query = 'UPDATE not_seen_chat_messages_count SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND user_id = $2';

//     await this.conn.query(query, [chatId, userId]);

//     return chatId;
//   }

//   async getNotSeenCountForUser(chatIds: string[], userId: string) {
//     const query = 'SELECT * FROM not_seen_chat_messages_count WHERE chat_id = any($1)';

//     const notSeenMap: { [key: string]: number } = {};

//     (await this.conn.query(query, [chatIds])).rows
//       .forEach((row: any) => {
//         if (userId !== row.user_id) {
//           return;
//         }

//         notSeenMap[row.chat_id] = row.not_seen_count;
//       });

//     return notSeenMap;
//   }

//   async getAllNotSeenCount(userId: string) {
//     const query = 'SELECT not_seen_count FROM not_seen_chat_messages_count WHERE user_id = $1';

//     let notSeenCount: number = 0;

//     (await this.conn.query(query, [userId])).rows
//       .forEach((row: any) => {
//         console.log('=>', row.not_seen_count);
//         notSeenCount += row.not_seen_count;
//       });
//     console.log('r:', notSeenCount);

//     return notSeenCount;
//   }

//   // CHAT_MEMBERS

//   async getCommonChatId(memberOneId: string, memberTwoId: string) {
//     // const query = `
//     // SELECT cm1.chat_id
//     // FROM chat_members AS cm1
//     // JOIN chat_members  AS cm2 ON cm1.chat_id = cm2.chat_id
//     // WHERE cm1.rel_id = $1 AND cm2.rel_id = $2
//     // `;
//     const query = `
//     SELECT id
//     FROM chats
//     WHERE (member_one_id = $1 AND member_two_id = $2) OR (member_one_id = $2 AND member_two_id = $1)
//     `;

//     const result = await this.conn.query(query, [memberOneId, memberTwoId]);

//     return result.rows[0]?.id ?? null;
//     // return result.rows.length === 1 ? result.rows[0].chat_id : null;
//   }

//   async incrementNotSeenCount(chatId: string, relIds: string[]) {
//     if (!relIds || 0 === relIds.length) return;

//     const query = `
//       UPDATE chat_members SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND rel_id IN ($${relIds.map((_, ix) => ix + 2)})
//     `;

//     return await this.conn.query(query, [chatId, ...relIds]);
//   }

//   async seeChatMessages(chatId: string, relId: string) {
//     const query = `
//       UPDATE chat_members SET not_seen_count = 0 WHERE chat_id = $1 AND rel_id = $2
//     `;

//     return await this.conn.query(query, [chatId, relId]);
//   }

//   async getNotSeenCount(relId: string) {
//     const query = `
//       SELECT chat_id, not_seen_count FROM chat_members WHERE rel_id = $1 AND not_seen_count > 0
//     `;

//     const result = await this.conn.query(query, [relId]);

//     return result.rows;
//   }

//   async createChatMembers(chatId: string, members: any[]) {
//     const query = `
//     INSERT INTO chat_members (chat_id, rel_id, rel_type, not_seen_count, created_at) VALUES
//       ($1, $2, $3, 0, $4),
//       ($5, $6, $7, 0, $8)
//     `;

//     const params = [];
//     for (const i of Array.prototype.concat(members.map(({ id, type }) => [chatId, id, type || 'user', currentTimeMs()]))) {
//       for (const j of i) params.push(j);
//     }

//     const result = await this.conn.query(query, params);

//     return result.rows;
//   }

//   async getChatIdsForUser(relId: string) {
//     const query = 'SELECT chat_id FROM chats WHERE member_one_id = $1 OR member_two_id = $1';
//     const result = await this.conn.query(query, [relId]);

//     return result.rows.map((chat: any) => chat.chat_id);
//   }

//   async getUserChats(relId: string) {
//     const query = 'SELECT * FROM chats WHERE member_one_id = $1 OR member_two_id = $1';
//     const result = await this.conn.query(query, [relId]);

//     return result.rows;
//   }

//   async getChatsMembersInChats(chatIds: string[]) {
//     if (0 === chatIds.length) return [];

//     const qin = chatIds.map((_, index) => `$${index + 1}`).join(', ');
//     const query = `
//       SELECT * FROM chat_members WHERE chat_id IN (${qin})
//     `;

//     const result = await this.conn.query(query, [...chatIds]);

//     return result.rows;
//   }

//   async getChatMembers(chatId: string) {
//     // const query = `
//     // SELECT chat_id, rel_id, rel_type
//     // FROM chat_members
//     // WHERE chat_id = $1
//     // `;
//     const query = 'SELECT member_one_id, member_two_id FROM chats WHERE id = $1'

//     const result = await this.conn.query(query, [chatId]);

//     return result.rows[0];
//   }

//   async findRelType(chatId: string, relId: string) {
//     const query = `
//     SELECT rel_type
//     FROM chat_members
//     WHERE chat_id = $1 AND rel_id = $2
//     `;

//     const result = await this.conn.query(query, [chatId, relId]);

//     const item = result.rows[0];

//     return item ? item.rel_type : null;
//   }

//   // async isChatMember(chatId: string, relId: string) {
//   //   const query = `
//   //   SELECT COUNT(*)
//   //   FROM chat_members
//   //   WHERE chat_id = $1 AND rel_id = $2
//   //   `;

//   //   const result = await this.conn.query(query, [chatId, relId]);

//   //   return 0 !== parseInt(result.rows[0].count);
//   // }

//   // CHAT_MESSAGES

//   async getChatMessages(chatId: string) {
//     const query = `
//     SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT ${ChatRepository.MESSAGES_PER_PAGE}
//     `;

//     const result = await this.conn.query(query, [chatId]);

//     return result.rows;
//   }

//   async getChatMessagesByIds(ids: string[]) {
//     if (!Array.isArray(ids) || ids.length === 0) return [];

//     const query = `SELECT * FROM chat_messages WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`)})`;

//     const result = await this.conn.query(query, ids);

//     return result.rows;
//   }

//   async getChatMessagesAfter(chatId: string, createdAt: number) {
//     const query = `
//     SELECT * FROM chat_messages WHERE chat_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT ${ChatRepository.MESSAGES_PER_PAGE}
//     `;

//     const result = await this.conn.query(query, [chatId, createdAt]);

//     return result.rows;
//   }

//   async loadChatMessages(chatId: string, ts: number) {
//     const query = `
//       SELECT * FROM chat_messages
//       WHERE chat_id = $1 AND created_at < $2
//       ORDER BY created_at DESC
//       LIMIT ${ChatRepository.MESSAGES_PER_PAGE}
//     `;

//     return (await this.conn.query(query, [chatId, ts])).rows;
//   }

//   async createMessage({
//     userId,
//     chatId,
//     text,
//     imageId
//   }: {
//     userId: string,
//     chatId: string,
//     text: string,
//     imageId?: string
//   }) {
//     const query = `
//     INSERT INTO chat_messages (id, member_id, chat_id, text, images_count, created_at)
//     VALUES ($1, $2, $3, $4, $5, $6)
//     `;

//     const message = { id: v4(), userId, chatId, text, createdAt: currentTimeMs() };
//     await this.conn.query(
//       query,
//       [message.id, userId, chatId, text, !!imageId ? 1 : 0, message.createdAt]
//     );

//     return message;
//   }

//   async createMessageImage(messageId: string, imageId: string) {
//     const id = v4();
//     const query = 'INSERT INTO message_medias (id, chat_messages_id, media_id) VALUES ($1, $2, $3)';
//     await this.conn.query(query, [id, messageId, imageId]);

//     return { id, messageId, imageId };
//   }

//   async getMessageImages(messageIds: string[]) {
//     const query = 'SELECT media_id, chat_messages_id FROM message_medias WHERE chat_messages_id = any($1)';

//     const result: { [key: string]: string } = {};

//     (await this.conn.query(query, [messageIds])).rows
//       .forEach(({ media_id, chat_messages_id }: any) => {
//         result[chat_messages_id] = media_id;
//       });;

//     return result;
//   }
// }
