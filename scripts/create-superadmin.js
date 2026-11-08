import dotenv from 'dotenv';
import path from 'node:path';
import readline from 'node:readline';
import mongoose from 'mongoose';
import { hashPassword } from '../backend/src/utils/security.js';
import { User } from '../backend/src/models/User.js';

// Load environment variables
dotenv.config({ path: path.resolve('backend/.env') });
dotenv.config({ path: path.resolve('.env') });

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
};

async function main() {
  console.log('=====================================================');
  console.log(' PRAVYUK SUPER ADMIN PROVISIONING UTILITY');
  console.log(' "Your Vision. Our Build."');
  console.log('=====================================================\n');

  // Parse args
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  let name = getArg('--name') || process.env.SUPER_ADMIN_NAME;
  let email = getArg('--email') || process.env.SUPER_ADMIN_EMAIL;
  let password = getArg('--password') || process.env.SUPER_ADMIN_PASSWORD;

  if (!email) {
    email = await askQuestion('Enter Super Admin Email: ');
  }
  if (!name) {
    name = await askQuestion('Enter Super Admin Name [Pravyuk SuperAdmin]: ') || 'Pravyuk SuperAdmin';
  }
  if (!password) {
    password = await askQuestion('Enter Super Admin Password (min 8 chars): ');
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Error: A valid email address is required.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters in length.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && !mongoUri.includes('YOUR_DATABASE_CONNECTION')) {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);

    let user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (user) {
      console.log(`Account found for ${normalizedEmail}. Elevating to SUPER_ADMIN...`);
      user.name = name;
      user.role = 'super_admin';
      user.permissions = ['*'];
      user.status = 'active';
      user.password = password; // pre-save hook will hash
      await user.save();
    } else {
      console.log(`Creating new SUPER_ADMIN account for ${normalizedEmail}...`);
      user = new User({
        name,
        email: normalizedEmail,
        password,
        role: 'super_admin',
        permissions: ['*'],
        status: 'active',
      });
      await user.save();
    }

    await mongoose.disconnect();
    console.log('\n[SUCCESS] Super Admin account provisioned in MongoDB successfully!');
  } else {
    console.log('[NOTE] MONGODB_URI not configured. Provisioning offline test super admin credentials...');
  }

  console.log(`\nAccount Details:`);
  console.log(`- Email       : ${normalizedEmail}`);
  console.log(`- Name        : ${name}`);
  console.log(`- Role        : SUPER_ADMIN`);
  console.log(`- Permissions : Full System Access [*]`);
  console.log(`- Status      : Active`);
  console.log(`- Admin URL   : /pages/admin.html`);
  console.log('\nKeep these credentials secure. Never share the super admin password.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Fatal Error]', err.message);
  process.exit(1);
});
