import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  code: { type: String, unique: true, required: true },
  isActive: { type: Boolean, default: true },
  materials: [{ type: String }],
  quizData: { type: Object },
  config: {
    questionTypes: [String],
    gradingMode: String, // 'strict' | 'open'
    markingType: { type: String, default: 'batch' }, // 'instant' | 'batch'
    counts: Object
  }
}, { timestamps: true });

const SubmissionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  studentName: String,
  studentEmail: String, // NEW
  answers: Object,
  grades: Object,
  totalScore: { type: Number, default: 0 },
  status: { type: String, default: 'pending' }, // 'pending' | 'graded'
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);

export { User, Room, Submission };