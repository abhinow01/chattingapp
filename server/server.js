// Import necessary modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const aws = require('aws-sdk');
const { drizzle } = require('drizzle-orm');
const { Client } = require('pg');
require('dotenv').config();

// Initialize express app and server
const app = express();
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadToS3 = (buffer, fileName) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/png',
    };

    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
};

const storage = multer.memoryStorage();
const upload = multer({ storage });

// PostgreSQL client setup
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

const db = drizzle(client);

// Define schemas with Drizzle ORM
const User = db.defineTable('users', {
  id: { type: 'serial', primaryKey: true },
  username: { type: 'text', notNull: true },
  online: { type: 'boolean', default: false },
  socketId: { type: 'text' },
});

const Message = db.defineTable('messages', {
  id: { type: 'serial', primaryKey: true },
  senderId: { type: 'integer', references: User.id, notNull: true },
  recipientId: { type: 'integer', references: User.id, notNull: true },
  content: { type: 'text', notNull: true },
  type: { type: 'text', notNull: true },
  timestamp: { type: 'timestamp', default: db.raw('CURRENT_TIMESTAMP') },
  read: { type: 'boolean', default: false },
});

const Upload = db.defineTable('uploads', {
  id: { type: 'serial', primaryKey: true },
  url: { type: 'text', notNull: true },
  uploadedAt: { type: 'timestamp', default: db.raw('CURRENT_TIMESTAMP') },
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected');

  // User login
  socket.on('login', async (username) => {
    let user = await db
      .update(User)
      .set({ online: true, socketId: socket.id })
      .where(User.username.eq(username))
      .returning('*')
      .run();

    if (user.length === 0) {
      user = await db
        .insert(User)
        .values({ username, online: true, socketId: socket.id })
        .returning('*')
        .run();
    }

    socket.broadcast.emit('user_status', { userId: user[0].id, online: true });
    const users = await db.select().from(User).run();
    io.emit('user_list', users);
  });

  // Send message
  socket.on('send_message', async (data) => {
    const { recipientId, content, type } = data;
    const sender = await db
      .select()
      .from(User)
      .where(User.socketId.eq(socket.id))
      .limit(1)
      .run();

    if (!sender.length) return;

    const message = await db
      .insert(Message)
      .values({
        senderId: sender[0].id,
        recipientId,
        content,
        type,
      })
      .returning('*')
      .run();

    io.to(recipientId).emit('new_message', message[0]);
  });

  // Typing indicator
  socket.on('typing', (recipientId) => {
    io.to(recipientId).emit('user_typing', { userId: socket.id });
  });

  // Mark message as read
  socket.on('mark_read', async (messageId) => {
    const message = await db
      .update(Message)
      .set({ read: true })
      .where(Message.id.eq(messageId))
      .returning('*')
      .run();

    if (message.length) {
      io.to(message[0].senderId.toString()).emit('message_read', messageId);
    }
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    const user = await db
      .update(User)
      .set({ online: false })
      .where(User.socketId.eq(socket.id))
      .returning('*')
      .run();

    if (user.length) {
      io.emit('user_status', { userId: user[0].id, online: false });
      const users = await db.select().from(User).run();
      io.emit('user_list', users);
    }
    console.log('Client disconnected');
  });
});

// API Route to get messages for a user
app.get('/api/messages/:userId', async (req, res) => {
  const userId = req.params.userId;
  const userMessages = await db
    .select()
    .from(Message)
    .where(
      Message.senderId.eq(userId).or(Message.recipientId.eq(userId))
    )
    .run();

  res.json(userMessages);
});

// API Route to handle file uploads
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    const fileUrl = await uploadToS3(
      req.file.buffer,
      `uploads/${Date.now()}_${req.file.originalname}`
    );
    await db.insert(Upload).values({ url: fileUrl }).run();
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
