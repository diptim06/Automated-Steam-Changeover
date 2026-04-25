# Automated Steam Changeover System

## Overview

The Automated Steam Changeover System is designed to ensure uninterrupted steam supply in industrial environments by automatically switching between steam lines based on real-time flow conditions. The system reduces manual intervention and improves operational reliability.

---

## Problem Statement

In industrial setups, steam distribution often relies on manual monitoring and switching between lines. This can lead to delays, human error, and potential system downtime, affecting efficiency and safety.

---

## Solution

This project automates monitoring and decision-making by continuously evaluating system conditions and triggering a changeover when required. It provides a more reliable and consistent alternative to manual control.

---

## Key Features

* Real-time monitoring of system parameters
* Automatic switching between steam lines
* Alert mechanism for abnormal conditions
* Web-based interface for monitoring and control
* Event logging for system tracking

---

## System Workflow

1. System parameters are continuously monitored
2. Backend logic evaluates conditions against predefined thresholds
3. If a fault or drop is detected, the system triggers a changeover
4. Events are logged and reflected on the user interface

---

## Tech Stack

* Frontend: HTML, CSS, JavaScript
* Backend: Node.js, Express.js
* Database: MongoDB (using native Node.js driver)

---

## Database Approach

The application uses the native MongoDB Node.js driver instead of an ORM.
This allows direct interaction with collections using methods such as:

* `insertOne()` for data insertion
* `find()` and `toArray()` for data retrieval

This approach provides simplicity, fine-grained control, and minimal abstraction.

---

## Installation and Setup

### Prerequisites

* Node.js
* MongoDB instance (local or cloud)

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/diptim06/Automated-Steam-Changeover.git
   ```

2. Navigate to the project directory:

   ```bash
   cd Automated-Steam-Changeover
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Configure environment variables:
   Create a `.env` file and add:

   ```
   MONGO_URI=your_mongodb_connection_string
   ```

5. Start the application:

   ```bash
   npm start
   ```

6. Access the application:

   ```
   http://localhost:3000
   ```

---

## Project Structure

* `server.js` – Backend logic and routing
* `db.js` – MongoDB connection and queries
* `index.html` – Frontend interface
* `package.json` – Dependencies and scripts

---

## Future Scope

* Integration with IoT-based sensors for real-time data input
* Advanced analytics and visualization
* Predictive fault detection
* Role-based access control

---

## Conclusion

This system demonstrates how automation can improve reliability and efficiency in industrial steam management by reducing dependency on manual operations.

---

## License

This project is intended for academic and demonstration purposes.
