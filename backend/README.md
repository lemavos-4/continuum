# Continuum — Backend

⚠️ This repository contains the backend of the **Continuum** project.

Continuum is a privacy-first ecosystem designed to turn personal knowledge and digital assets into something measurable, visual, and actionable through intelligent vaults and knowledge graphs.

---

🧠 Concept

Continuum is an application that provides secure, isolated environments (Vaults) to help users organize notes, entities, and files while visualizing connections over time.

Instead of fragmented information, it focuses on a system-driven approach to data, using knowledge graphs and secure cloud persistence to make evolution easy to understand.

The backend is responsible for:
* **Secure Data Modeling**: Advanced persistence of notes and connected entities.
* **Cloud Vault Integration**: Automated file management via Backblaze B2.
* **Hardened Security**: Multi-layer authentication and XSS sanitization.
* **Metrics & Connectivity**: Serving structured data for knowledge graph visualization.


---

❗ Problem

Traditional note-taking and tracking tools often suffer from:
* **Privacy Silos**: Data is either unencrypted or hard to export.
* **Lack of Context**: Information exists in isolation without meaningful connections.
* **Scalability Friction**: Systems become slow and disorganized as data grows.

Continuum addresses this by providing a clear, structured, and secure backend that supports long-term knowledge evolution without friction.

---

✨ Core Features
* **Secure Knowledge Vaults**: Isolated cloud storage for sensitive attachments.
* **Entity Graph Mapping**: Automatic extraction and connection of data points.
* **Advanced Auth Flow**: JWT rotation, global logout, and Rate Limiting protection.
* **Data Hygiene**: Real-time HTML sanitization to prevent injection and XSS.

---

⚙️ Tech Stack
* **Java 21 (LTS)** & **Spring Boot 3.4**
* **MongoDB**: High-performance document and graph storage.
* **Backblaze B2**: Native cloud integration for private storage.
* **Spring Security**: Hardened JWT-based authentication.
* **Bucket4j**: Resilience via distributed rate limiting.
* **Maven**: Dependency and build management.

---

🧱 Architecture Principles
* **Clean, Layered Structure**: Separation of concerns (Controllers, Services, Domain, Persistence).
* **Stateless Security**: Fully decoupled authentication for horizontal scaling.
* **Tenant Isolation**: Logical and physical data separation per user.
* **Robustness over Shortcuts**: Prioritizing validation and error handling.

---

🚧 Project Status
Continuum is actively under development.
The backend is evolving iteratively, with features being built, refactored, and hardened as the system grows.
Expect changes — stability comes after correctness.

---

📌 Vision
Continuum is not just about storing data. It’s about building a system that helps people:
* **Understand their patterns** through visual connectivity.
* **Own their data** via secure, private vaults.
* **Scale their knowledge** without losing organization.

Backend-first, system-driven, and designed to protect your digital continuum.

---

> "What gets measured gets improved — if the system is designed right."
