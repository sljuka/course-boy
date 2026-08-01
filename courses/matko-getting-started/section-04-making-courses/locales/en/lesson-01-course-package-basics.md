# Course Package Basics

A Matko course package is a structured directory.

At the top level, `course.json` describes the course. Each `section-xx-*` directory contains a `section.json`, one or more `lesson-xx-*.json` files, optional `test-xx-*.json` files, and localized markdown lesson bodies.

The goal is to keep authored content readable in plain files while still making it easy for the app to validate and render the package consistently.
