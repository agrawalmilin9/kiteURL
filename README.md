# KiteURL — URL Shortener & Analytics

KiteURL is a full-stack URL shortening and analytics application built with React, TypeScript, Node.js, and Express.

## Features

- Create shortened URLs with custom aliases
- Track clicks, devices, browsers, and referral sources
- View analytics through an interactive dashboard
- Generate QR codes for shortened links
- Protect links using passwords
- Set link expiration dates
- Manage, edit, pause, and delete links
- Add UTM parameters for campaign tracking
- Export link data to CSV
- Protect management APIs using an admin API key
- Improve redirect performance using in-memory caching

## Tech Stack

**Frontend:** React, TypeScript, Tailwind CSS, Vite

**Backend:** Node.js, Express, REST APIs

**Storage:** Local JSON database

**Testing:** Vitest, Supertest

**Security:** API-key authentication, scrypt password hashing, input validation, and passcode rate limiting

## Getting Started

### Requirements

- Node.js compatible with Vite 8
- npm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/kiteURL.git
cd kiteURL
npm install
```

### Environment Configuration

Create a `.env` file using `.env.example` and configure a private `API_KEY`.

Never commit your `.env` file.

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### Run Tests

```bash
npm test
```

The project includes 50 automated API tests covering authentication, URL validation, redirects, password protection, expiration, and analytics.

### Production Build

```bash
npm run build
```

## Notes

KiteURL currently uses a local JSON file for persistence and an in-memory cache. It does not require PostgreSQL or Redis.

The admin API key is intended for a controlled demonstration rather than a multi-user authentication system.

## License

No license has been selected yet.