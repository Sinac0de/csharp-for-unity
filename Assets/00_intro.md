# How to Use This Book

This handbook collects the C# knowledge a Unity developer needs every day: the language itself, how Unity runs your code, how to keep it fast, and how to structure it so it stays maintainable. It is small on purpose. Read it once end to end, then keep it as a reference you can open at any chapter.

## How the chapters are organised

| Part | What it covers |
|---|---|
| I. C# Foundations | The language: types, memory, OOP, collections, generics, events, LINQ, errors, modern features |
| II. Unity Runtime | Lifecycle, serialization, ScriptableObjects, coroutines and async, memory and performance, saving, reflection |
| III. Architecture | SOLID, design patterns, dependency injection, clean code, testing, debugging |
| IV. Practice | Ready-to-use systems, interview questions, a capstone project, quick-reference sheets |

## The boxes you will see

> [tip] Best practice
> Habits used in professional Unity teams.

> [warn] Pitfall
> A mistake that is easy to make and costly to debug.

> [note] Unity note
> Behaviour that is specific to Unity rather than to C# in general.

> [perf] Performance
> Something that affects frame time or memory.

> [interview] Interview tip
> How to explain an idea in an interview.

## A suggested way to study

1. **First pass:** read a chapter and type the examples yourself instead of copying them.
2. **Second pass:** read only the Key Takeaways box at the end of each chapter and check that you can explain each point aloud.
3. **Apply it:** build the capstone project in Chapter 24 so the ideas connect.
4. **Maintain it:** when you learn something new, add it to the chapter where it belongs.

## Conventions and versions

- Code samples target **Unity 2021 LTS and newer, including Unity 6**. That means **C# 9.0**. Features from C# 10 and later (file-scoped namespaces, global usings, record structs) are not available in these versions.
- Class and method names in `monospace` refer to real Unity or .NET APIs. Some APIs were added or renamed across Unity versions; the text says so where it matters.
- Examples are deliberately short. They show one idea each and omit `using` lines unless they are needed to understand the code.
- Performance advice is a starting point. **Measure with the Profiler before optimising** (Chapter 14).
