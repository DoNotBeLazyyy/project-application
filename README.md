# Arellano University Learning Management System (AU-JAS LMS)

The official Learning Management System (LMS) for **Arellano University – Jose Abad Santos Campus**, built with React 18, TypeScript, Tailwind CSS, MUI v7, and Supabase (PostgreSQL 17).

---

## 📖 System Overview

The AU-JAS LMS provides an integrated academic portal serving five distinct institutional roles:
- **Admin**: Master calendar (School Years, Terms), user provisioning, grading templates, and system configuration.
- **Dean**: Academic departments, degree programs, course catalogs, prerequisite dependency maps, curriculum mapping, and section scheduling.
- **Registrar**: Student roster management, section enrollments, batch progression, and final grade releases.
- **Faculty**: Assigned section management, attendance tracking, continuous grade sheets, rubric builder, assessment creation, and psychometric item analysis.
- **Student**: Weekly timetables, enrolled subjects, real-time assessment taker with server timers, grade view, and faculty evaluations.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0+ or v20.0+ (Node v24 supported)
- **Supabase CLI** (optional for local functions / migrations)

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Ensure `.env.dev` (or `.env.prd`) is configured with your Supabase credentials:
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Development Server
```bash
# Start development mode
npm run dev

# Or with specific environment file
npm run start-dev
```

### 4. Build & Typecheck
```bash
# Typecheck (tsc -b) and compile for development
npm run build-dev

# Typecheck and compile for production
npm run build-prd
```

---

## 📚 Documentation Reference

- **[GEMINI.md](GEMINI.md)**: Master architectural guide, tech stack, and subsystem reference.
- **[RULES.md](RULES.md)**: Strict coding standards, ESLint rules, and database conventions.
- **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)**: Detailed role-by-role workflows and engine designs.
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: PostgreSQL tables, enums, triggers, and RPC standards.
- **[QA_AND_KNOWN_ISSUES.md](QA_AND_KNOWN_ISSUES.md)**: QA findings, resolved defects, and open bug list.
- **[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)**: Live production readiness analysis and strategic roadmap.

---

## 🔒 Security Architecture Note

The application operates on a **Thick Database, Thin Client** model. All business logic, grade computations, and authorization assertions are enforced inside PostgreSQL functions (`fn_*`) and Row Level Security (RLS).
