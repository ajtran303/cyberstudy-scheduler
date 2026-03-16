import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function startOfDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function endAfter(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60000);
}

export async function seedDemoUser(prisma: PrismaClient) {
  const password = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
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
          { name: "TCP/IP Protocol Suite", date: daysAgo(13), mastery: "LEARNING", lastReviewedAt: daysAgo(15), sortOrder: 0, details: "Layers, encapsulation, headers", keyTerms: [{ term: "TCP", definition: "Transmission Control Protocol - reliable, connection-oriented" }, { term: "UDP", definition: "User Datagram Protocol - unreliable, connectionless" }] },
          { name: "Firewall Configuration", date: daysAgo(6), mastery: "NOT_STARTED", sortOrder: 1, details: "iptables, pfSense, rule ordering", keyTerms: [{ term: "iptables", definition: "Linux command-line firewall utility that uses policy chains to allow or block traffic" }, { term: "pfSense", definition: "Open-source firewall/router software distribution based on FreeBSD" }, { term: "Stateful Inspection", definition: "Firewall technique that monitors the state of active connections and uses this info to determine which packets to allow" }, { term: "ACL", definition: "Access Control List — ordered set of rules that permit or deny traffic based on IP, port, or protocol" }] },
          { name: "Network Segmentation", date: daysFromNow(1), mastery: "NOT_STARTED", sortOrder: 2 },
          { name: "VPN Technologies", date: daysFromNow(8), mastery: "PROFICIENT", lastReviewedAt: daysAgo(16), sortOrder: 3, details: "IPSec, WireGuard, OpenVPN", keyTerms: [{ term: "IPSec", definition: "Internet Protocol Security — suite of protocols that encrypts and authenticates IP packets for secure network communication" }, { term: "WireGuard", definition: "Modern, lightweight VPN protocol using state-of-the-art cryptography with a minimal attack surface" }, { term: "Tunnel Mode", definition: "VPN encapsulation mode where the entire original IP packet is encrypted and wrapped in a new IP header" }] },
          { name: "Intrusion Detection Systems", date: daysFromNow(15), mastery: "NOT_STARTED", sortOrder: 4 },
          { name: "DNS Security", date: daysFromNow(22), mastery: "LEARNING", lastReviewedAt: daysAgo(19), sortOrder: 5, keyTerms: [{ term: "DNSSEC", definition: "DNS Security Extensions — adds cryptographic signatures to DNS records to prevent spoofing and cache poisoning" }, { term: "DNS Spoofing", definition: "Attack that corrupts DNS cache to redirect a domain name to a malicious IP address" }, { term: "DoH", definition: "DNS over HTTPS — encrypts DNS queries inside HTTPS to prevent eavesdropping and manipulation" }] },
        ],
      },
      assignments: {
        create: [
          { name: "Lab 1: Packet Capture with Wireshark", dueDate: daysAgo(9), description: "Capture and analyze TCP handshake", sortOrder: 0 },
          { name: "Lab 2: Firewall Rules", dueDate: daysAgo(2), description: "Configure iptables rules", sortOrder: 1 },
          { name: "Research Paper: Zero Trust Architecture", dueDate: daysFromNow(16), sortOrder: 2 },
        ],
      },
      exams: {
        create: [
          { name: "Midterm Exam", date: daysFromNow(30), description: "Covers weeks 1-7", sortOrder: 0 },
          { name: "Final Exam", date: daysFromNow(65), description: "Comprehensive", sortOrder: 1 },
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
          { name: "Reconnaissance & OSINT", date: daysAgo(11), mastery: "PROFICIENT", lastReviewedAt: daysAgo(14), sortOrder: 0, keyTerms: [{ term: "OSINT", definition: "Open-Source Intelligence — gathering information from publicly available sources for security analysis" }, { term: "Shodan", definition: "Search engine that indexes internet-connected devices, revealing exposed services, ports, and vulnerabilities" }, { term: "Google Dorking", definition: "Using advanced Google search operators (site:, filetype:, inurl:) to find sensitive information exposed on websites" }, { term: "WHOIS", definition: "Protocol for querying domain registration databases to find ownership, contact, and nameserver information" }] },
          { name: "Scanning & Enumeration", date: daysAgo(4), mastery: "LEARNING", lastReviewedAt: daysAgo(15), sortOrder: 1, details: "Nmap, Masscan, service detection", keyTerms: [{ term: "Nmap", definition: "Network Mapper — open-source tool for network discovery and security auditing that scans hosts for open ports and services" }, { term: "SYN Scan", definition: "Half-open TCP scan that sends SYN packets without completing the handshake, making it faster and stealthier than a full connect scan" }, { term: "Banner Grabbing", definition: "Technique of connecting to a service and reading its response banner to identify software name, version, and OS" }] },
          { name: "Exploitation Basics", date: daysFromNow(3), mastery: "NOT_STARTED", sortOrder: 2, keyTerms: [{ term: "CVE", definition: "Common Vulnerabilities and Exposures — standardized identifier system for publicly known security vulnerabilities" }, { term: "Payload", definition: "The code or commands delivered by an exploit that perform the attacker's intended action on the target system" }, { term: "Metasploit", definition: "Open-source penetration testing framework providing exploit modules, payloads, and post-exploitation tools" }] },
          { name: "Post-Exploitation", date: daysFromNow(10), mastery: "NOT_STARTED", sortOrder: 3 },
          { name: "Web Application Attacks", date: daysFromNow(17), mastery: "NOT_STARTED", sortOrder: 4 },
        ],
      },
      assignments: {
        create: [
          { name: "CTF Challenge Set 1", dueDate: daysAgo(6), sortOrder: 0, status: "DONE" },
          { name: "Pentest Report: Lab Network", dueDate: daysFromNow(12), sortOrder: 1 },
        ],
      },
      exams: {
        create: [
          { name: "Practical Exam: Network Pentest", date: daysFromNow(35), sortOrder: 0 },
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
          { name: "Symmetric Encryption", mastery: "NOT_STARTED", sortOrder: 0, keyTerms: [{ term: "AES", definition: "Advanced Encryption Standard — symmetric block cipher using 128/192/256-bit keys, the most widely used encryption algorithm" }, { term: "Block Cipher", definition: "Encryption algorithm that processes data in fixed-size blocks (e.g. 128 bits) using a symmetric key" }, { term: "Key Schedule", definition: "Algorithm that expands a cipher key into multiple round keys used in each round of encryption" }] },
          { name: "Asymmetric Encryption", mastery: "NOT_STARTED", sortOrder: 1, keyTerms: [{ term: "RSA", definition: "Rivest-Shamir-Adleman — public-key cryptosystem based on the difficulty of factoring large prime numbers" }, { term: "Public Key", definition: "The freely shared half of an asymmetric key pair, used to encrypt data or verify digital signatures" }, { term: "Key Exchange", definition: "Protocol (e.g. Diffie-Hellman) allowing two parties to establish a shared secret over an insecure channel" }] },
          { name: "Hash Functions", mastery: "NOT_STARTED", sortOrder: 2, keyTerms: [{ term: "SHA-256", definition: "Secure Hash Algorithm producing a 256-bit digest, widely used for data integrity verification and digital signatures" }, { term: "Collision Resistance", definition: "Property of a hash function where it is computationally infeasible to find two different inputs producing the same hash output" }, { term: "Salt", definition: "Random data added to a password before hashing to prevent rainbow table attacks and ensure identical passwords produce different hashes" }] },
          { name: "Digital Signatures", mastery: "NOT_STARTED", sortOrder: 3 },
          { name: "PKI & Certificate Management", mastery: "NOT_STARTED", sortOrder: 4 },
        ],
      },
    },
  });

  // Study events for TCP/IP topic
  const tcpTopic = await prisma.topic.findFirst({
    where: { name: "TCP/IP Protocol Suite", courseId: netSec.id },
  });

  if (tcpTopic) {
    await prisma.teachItBack.createMany({
      data: [
        { topicId: tcpTopic.id, outcome: "PARTIAL", notes: "Explained TCP handshake well but confused UDP use cases. Need to review when UDP is preferred over TCP.", attemptedAt: daysAgo(16) },
        { topicId: tcpTopic.id, outcome: "PASS", notes: "Clear explanation of all four layers. Good examples of encapsulation. Ready for hardened.", attemptedAt: daysAgo(15) },
      ],
    });

    await prisma.quizAttempt.createMany({
      data: [
        { topicId: tcpTopic.id, correct: true, questionText: "What is the purpose of the TCP three-way handshake?", sessionId: "quiz-daily-cist1001" },
        { topicId: tcpTopic.id, correct: false, questionText: "Which layer of the TCP/IP model handles routing?", sessionId: "quiz-daily-cist1001" },
        { topicId: tcpTopic.id, correct: true, questionText: "What port does HTTPS use by default?", sessionId: "quiz-daily-cist1001" },
      ],
    });
  }

  // Quiz attempts for Recon topic
  const reconTopic = await prisma.topic.findFirst({
    where: { name: "Reconnaissance & OSINT", courseId: ethHack.id },
  });

  if (reconTopic) {
    await prisma.quizAttempt.createMany({
      data: [
        { topicId: reconTopic.id, correct: true, questionText: "What is the difference between passive and active reconnaissance?", sessionId: "quiz-daily-cist2100" },
        { topicId: reconTopic.id, correct: true, questionText: "Name three OSINT tools for domain enumeration.", sessionId: "quiz-daily-cist2100" },
      ],
    });
  }

  // Study sessions spread over the past 2 weeks
  const sessionData = [
    { courseId: netSec.id, startedAt: startOfDaysAgo(13), durationMinutes: 45, notes: "Reviewed TCP/IP layers and handshake process" },
    { courseId: ethHack.id, startedAt: startOfDaysAgo(12), durationMinutes: 60, notes: "OSINT practice with theHarvester and Maltego" },
    { courseId: netSec.id, startedAt: startOfDaysAgo(10), durationMinutes: 30, notes: "Firewall rule ordering lab prep" },
    { courseId: ethHack.id, startedAt: startOfDaysAgo(8), durationMinutes: 90, notes: "Nmap scanning techniques and service enumeration" },
    { courseId: netSec.id, startedAt: startOfDaysAgo(6), durationMinutes: 55, notes: "VPN technologies comparison: IPSec vs WireGuard" },
    { courseId: netSec.id, startedAt: startOfDaysAgo(4), durationMinutes: 40, notes: "DNS security and DNSSEC" },
    { courseId: ethHack.id, startedAt: startOfDaysAgo(2), durationMinutes: 75, notes: "CTF challenge practice" },
    { courseId: netSec.id, startedAt: startOfDaysAgo(1), durationMinutes: 35, notes: "Wireshark packet capture lab" },
  ];

  for (const s of sessionData) {
    await prisma.studySession.create({
      data: {
        userId: user.id,
        courseId: s.courseId,
        startedAt: s.startedAt,
        endedAt: endAfter(s.startedAt, s.durationMinutes),
        durationMinutes: s.durationMinutes,
        notes: s.notes,
      },
    });
  }

  return user;
}
