# Goal Peering Backend

This repository contains the **backend** for managing "Goals" and peer engagment on helping eachother on the achievment process. The system serves API for managing goals, tips, success stories, and chat groups. 

1. [Overview](#1-overview)  
2. [Environment Variables](#2-environment-variables)  
3. [Setup & Installation](#3-setup--installation)  
4. [Run tests](#4-run-tests)  

---

## 1. Overview

The application includes a Node.js/Express API and Socket.IO server

This backend securely handles user authentication, goal management, real-time chat, and voting functionality via a PostgreSQL database, and is deployed on Heroku with SSL.

---

## 2. Environment Variables

Create a `.env` file in the project root with the following variables (example):

```bash
# PostgreSQL Environment Variables
POSTGRES_USER=dc_user
POSTGRES_PASSWORD=db_password
POSTGRES_DB=dc_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Construct DATABASE_URL from the above variables
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# JWT Secret
JWT_SECRET=your_jwt_secret

```

## 3. Setup & Installation

Clone the repo:

```bash

git clone https://github.com/Kidist-Abraham/GoalPeeringApi.git
cd GoalPeeringApi
```

Create and populate .env file (see [Environment Variables](#2-environment-variables) ).

Run docker compose:

```bash
 docker-compose up --build -d
```

This will run the database and backed services and the backed server listens on localhost PORT 3000.