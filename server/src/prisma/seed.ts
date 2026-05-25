import bcrypt from 'bcryptjs'
import { prisma } from '../common/utils/prisma'

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@timeline.local' },
    update: {
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'SUPER_ADMIN',
      is_active: true,
    },
    create: {
      email: 'admin@timeline.local',
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'SUPER_ADMIN',
      is_active: true,
    },
  })

  console.log(`Seeded user: ${user.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
