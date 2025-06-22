# ATTENDANCE

A robust and scalable Attendance template using Express.js and TypeScript, designed for building modern web applications.

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- TypeScript (v4.5 or higher)
- npm or yarn

## 🚀 Quick Start

1. Clone the repository:

```bash
git clone https://github.com/git-attendance/attendance-api.git
cd attendance-api
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/your-database
NODE_ENV=development
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

4. Start the development server:

```bash
npm run dev
```

## 🛠️ Scripts

- `npm run dev`: Start development server with hot-reload
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests

## 📁 Project Structure

```
├── config/        # Configuration files
├── helpers/       # Helpers files
├── controllers/   # Route controllers
├── middlewares/   # Custom middlewares
├── models/        # MongoDB models
├── repositories/  # Database operations
├── routes/        # API routes
├── services/      # Business logic
└── index.ts       # Express app initialization
```

## 🔒 Environment Variables

| Variable       | Description                     | Default     |
| -------------- | ------------------------------- | ----------- |
| PORT           | Server port                     | 5000        |
| MONGODB_URI    | MongoDB connection URL          | -           |
| NODE_ENV       | Environment                     | development |
| EMAIL_USER     | Email account for notifications | -           |
| EMAIL_PASSWORD | Email app password              | -           |

### 📧 Email Configuration (Gmail)

To enable email notifications for events:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use your Gmail address for `EMAIL_USER`
4. Use the generated app password for `EMAIL_PASSWORD`

**Note**: Email notifications are sent automatically when new events are created. All users with email addresses in the database will receive notifications.

## 🔗 API Endpoints

Document your API endpoints here. Example:

```typescript
GET    /api/v1/resource
POST   /api/v1/resource
PUT    /api/v1/resource/:id
DELETE /api/v1/resource/:id
```

## 💻 Technology Stack

- Express.js
- TypeScript
- MongoDB & Mongoose
- ESLint & Prettier
- Winston (Logging)
- Helmet (Security)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Express.js documentation
- MongoDB documentation
- TypeScript documentation
