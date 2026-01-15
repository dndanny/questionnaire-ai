
import * as db from './db-handler';
import { User, Room } from '@/models';

describe('MongoDB Models', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => await db.clearDatabase());
  afterAll(async () => await db.closeDatabase());

  it('should create & save user successfully', async () => {
    const validUser = new User({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'John Doe',
      isVerified: true
    });
    const savedUser = await validUser.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe('test@example.com');
  });

  it('should fail to save user with duplicate email', async () => {
    const user1 = new User({ email: 'dup@test.com', password: '123', name: 'A' });
    await user1.save();

    const user2 = new User({ email: 'dup@test.com', password: '456', name: 'B' });
    
    await expect(user2.save()).rejects.toThrow(); // Mongoose error
  });

  it('should link Room to Host correctly', async () => {
    const host = await User.create({ email: 'host@test.com', password: '123' });
    
    const room = await Room.create({
        hostId: host._id,
        code: 'ABCDEF',
        materials: ['some data']
    });

    const foundRoom = await Room.findOne({ code: 'ABCDEF' }).populate('hostId');
    expect(foundRoom.hostId.email).toBe('host@test.com');
  });
});
