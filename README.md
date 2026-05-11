# 💧 Aqua Management System

A professional JavaFX desktop application for managing a water can delivery business.

## Features

- **Dashboard** — View total customers, today's deliveries, monthly income, and pending bills at a glance
- **Customer Management** — Add, edit, delete, and search customers with custom jar/bottle rates
- **Daily Delivery Entry** — Record daily water deliveries with customer search, date picker, and quantity entry
- **Monthly Billing** — Auto-generate monthly bills, calculate totals, mark paid/pending
- **PDF Export** — Generate professional PDF invoices with itemized breakdown
- **Print Support** — Print bills directly from the application
- **SQLite Database** — Embedded database, no server installation needed

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Java 17    | Core language |
| JavaFX 21  | Desktop UI framework |
| SQLite     | Embedded database (via sqlite-jdbc) |
| iTextPDF   | PDF invoice generation |
| Maven      | Build & dependency management |

## Project Structure

```
src/main/java/com/aqua/
├── App.java                    # Main application entry point
├── model/                      # Data models (Customer, Delivery, Bill)
├── controller/                 # UI views (Dashboard, Customer, Delivery, Bill)
├── service/                    # Business logic layer
├── repository/                 # Data access layer (SQL queries)
├── database/                   # Database connection manager
└── util/                       # Utilities (AlertUtil, PDFGenerator)
```

## Prerequisites

- **Java 17+** (JDK)
- **Maven 3.8+**

> **No database server needed!** SQLite creates a local `aqua_management.db` file automatically.

## How to Run

```bash
# Clone or navigate to the project directory
cd aqua-management-system

# Compile and run
mvn clean javafx:run
```

## How to Build a Distributable JAR

```bash
mvn clean package
```

## Database

The application uses **SQLite** — an embedded database that stores all data in a single file (`aqua_management.db`) in the application directory. No MySQL, PostgreSQL, or any external database server is required.

When you first run the app, the database and all tables are created automatically.

## Screenshots

The application features:
- Dark sidebar navigation with water-themed branding
- Clean white content area with card-based dashboard
- Excel-like table views for data management
- Professional PDF invoice generation

## License

This project is for educational and commercial use.
