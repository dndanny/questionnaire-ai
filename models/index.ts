import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  isVerified: { type: Boolean, default: false },
  verificationCode: String,
  verificationExpires: Date,
  // NEW: AI Quota System
  aiUsage: { type: Number, default: 0 },
  aiLimit: { type: Number, default: 5 },
}, { timestamps: true });

// NEW: Security Log for Rate Limiting
const SecurityLogSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., "login:email@test.com" or "ip:127.0.0.1"
  failures: { type: Number, default: 0 },
  lockCount: { type: Number, default: 0 }, // How many times they hit the limit (for exponential backoff)
  blockedUntil: { type: Date, default: null },
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  code: { type: String, unique: true, required: true },
  isActive: { type: Boolean, default: true },
  materials: [{ type: String }],
  quizData: { type: Object },
  config: {
    questionTypes: [String],
    gradingMode: String,
    markingType: { type: String, default: 'batch' },
    counts: Object
  }
}, { timestamps: true });

const SubmissionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  studentName: String,
  studentEmail: String,
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: String,
  answers: Object,
  grades: Object,
  totalScore: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
const SecurityLog = mongoose.models.SecurityLog || mongoose.model('SecurityLog', SecurityLogSchema);

export { User, Room, Submission, SecurityLog };