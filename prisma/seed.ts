import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo user
  const password = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "sev@example.com" },
    update: {},
    create: {
      email: "sev@example.com",
      name: "Sev",
      password,
    },
  });

  // Course 1: Network Security
  const netSec = await prisma.course.create({
    data: {
      userId: user.id,
      name: "Network Security Fundamentals",
      courseCode: "CIST 1001",
      professorName: "Dr. Chen",
      professorEmail: "chen@example.com",
      status: "IN_PROGRESS",
      color: "#6366f1",
      sortOrder: 0,
      topics: {
        create: [
          { name: "TCP/IP Protocol Suite", date: new Date("2026-03-03"), mastery: "SCANNING", lastReviewedAt: new Date("2026-03-01"), sortOrder: 0, details: "Layers, encapsulation, headers", keyTerms: [{ term: "TCP", definition: "Transmission Control Protocol - reliable, connection-oriented" }, { term: "UDP", definition: "User Datagram Protocol - unreliable, connectionless" }] },
          { name: "Firewall Configuration", date: new Date("2026-03-10"), mastery: "EXPOSED", sortOrder: 1, details: "iptables, pfSense, rule ordering" },
          { name: "Network Segmentation", date: new Date("2026-03-17"), mastery: "EXPOSED", sortOrder: 2 },
          { name: "VPN Technologies", date: new Date("2026-03-24"), mastery: "HARDENED", lastReviewedAt: new Date("2026-02-28"), sortOrder: 3, details: "IPSec, WireGuard, OpenVPN" },
          { name: "Intrusion Detection Systems", date: new Date("2026-03-31"), mastery: "EXPOSED", sortOrder: 4 },
          { name: "DNS Security", date: new Date("2026-04-07"), mastery: "SCANNING", lastReviewedAt: new Date("2026-02-25"), sortOrder: 5 },
        ],
      },
      assignments: {
        create: [
          { name: "Lab 1: Packet Capture with Wireshark", dueDate: new Date("2026-03-07"), description: "Capture and analyze TCP handshake", sortOrder: 0 },
          { name: "Lab 2: Firewall Rules", dueDate: new Date("2026-03-14"), description: "Configure iptables rules", sortOrder: 1 },
          { name: "Research Paper: Zero Trust Architecture", dueDate: new Date("2026-04-01"), sortOrder: 2 },
        ],
      },
      exams: {
        create: [
          { name: "Midterm Exam", date: new Date("2026-04-15"), description: "Covers weeks 1-7", sortOrder: 0 },
          { name: "Final Exam", date: new Date("2026-05-20"), description: "Comprehensive", sortOrder: 1 },
        ],
      },
    },
  });

  // Course 2: Ethical Hacking
  const ethHack = await prisma.course.create({
    data: {
      userId: user.id,
      name: "Ethical Hacking & Penetration Testing",
      courseCode: "CIST 2100",
      professorName: "Prof. Martinez",
      status: "IN_PROGRESS",
      color: "#ef4444",
      sortOrder: 1,
      topics: {
        create: [
          { name: "Reconnaissance & OSINT", date: new Date("2026-03-05"), mastery: "HARDENED", lastReviewedAt: new Date("2026-03-02"), sortOrder: 0 },
          { name: "Scanning & Enumeration", date: new Date("2026-03-12"), mastery: "SCANNING", lastReviewedAt: new Date("2026-03-01"), sortOrder: 1, details: "Nmap, Masscan, service detection" },
          { name: "Exploitation Basics", date: new Date("2026-03-19"), mastery: "EXPOSED", sortOrder: 2 },
          { name: "Post-Exploitation", date: new Date("2026-03-26"), mastery: "EXPOSED", sortOrder: 3 },
          { name: "Web Application Attacks", date: new Date("2026-04-02"), mastery: "EXPOSED", sortOrder: 4 },
        ],
      },
      assignments: {
        create: [
          { name: "CTF Challenge Set 1", dueDate: new Date("2026-03-10"), sortOrder: 0, status: "DONE" },
          { name: "Pentest Report: Lab Network", dueDate: new Date("2026-03-28"), sortOrder: 1 },
        ],
      },
      exams: {
        create: [
          { name: "Practical Exam: Network Pentest", date: new Date("2026-04-20"), sortOrder: 0 },
        ],
      },
    },
  });

  // Course 3: Cryptography (not started)
  await prisma.course.create({
    data: {
      userId: user.id,
      name: "Applied Cryptography",
      courseCode: "CIST 3200",
      professorName: "Dr. Patel",
      status: "NOT_STARTED",
      color: "#8b5cf6",
      sortOrder: 2,
      topics: {
        create: [
          { name: "Symmetric Encryption", mastery: "EXPOSED", sortOrder: 0 },
          { name: "Asymmetric Encryption", mastery: "EXPOSED", sortOrder: 1 },
          { name: "Hash Functions", mastery: "EXPOSED", sortOrder: 2 },
          { name: "Digital Signatures", mastery: "EXPOSED", sortOrder: 3 },
          { name: "PKI & Certificate Management", mastery: "EXPOSED", sortOrder: 4 },
        ],
      },
    },
  });

  // Add some study events for Network Security topics
  const tcpTopic = await prisma.topic.findFirst({
    where: { name: "TCP/IP Protocol Suite", courseId: netSec.id },
  });

  if (tcpTopic) {
    await prisma.teachItBack.createMany({
      data: [
        { topicId: tcpTopic.id, outcome: "PARTIAL", notes: "Explained TCP handshake well but confused UDP use cases. Need to review when UDP is preferred over TCP.", attemptedAt: new Date("2026-02-28") },
        { topicId: tcpTopic.id, outcome: "PASS", notes: "Clear explanation of all four layers. Good examples of encapsulation. Ready for hardened.", attemptedAt: new Date("2026-03-01") },
      ],
    });

    await prisma.quizAttempt.createMany({
      data: [
        { topicId: tcpTopic.id, correct: true, questionText: "What is the purpose of the TCP three-way handshake?", sessionId: "quiz-2026-03-01-cist1001-daily" },
        { topicId: tcpTopic.id, correct: false, questionText: "Which layer of the TCP/IP model handles routing?", sessionId: "quiz-2026-03-01-cist1001-daily" },
        { topicId: tcpTopic.id, correct: true, questionText: "What port does HTTPS use by default?", sessionId: "quiz-2026-03-01-cist1001-daily" },
      ],
    });
  }

  // Add quiz attempts for ethical hacking
  const reconTopic = await prisma.topic.findFirst({
    where: { name: "Reconnaissance & OSINT", courseId: ethHack.id },
  });

  if (reconTopic) {
    await prisma.quizAttempt.createMany({
      data: [
        { topicId: reconTopic.id, correct: true, questionText: "What is the difference between passive and active reconnaissance?", sessionId: "quiz-2026-03-02-cist2100-daily" },
        { topicId: reconTopic.id, correct: true, questionText: "Name three OSINT tools for domain enumeration.", sessionId: "quiz-2026-03-02-cist2100-daily" },
      ],
    });
  }

  console.log("Seed data created successfully!");
  console.log(`  User: ${user.email} / password123`);
  console.log(`  Courses: ${netSec.name}, ${ethHack.name}, Applied Cryptography`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
