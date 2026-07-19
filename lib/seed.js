import bcrypt from 'bcryptjs';
import { db, isMongo, connectDB } from './db';

const DEFAULT_CLUBS = [
  { name: '180DC', description: 'Consulting Club' },
  { name: 'ACM STUDENT CHAPTER', description: 'Technical Chapter' },
  { name: 'ACM WOMEN', description: 'Technical Chapter for Women' },
  { name: 'AEROSPACE CLUB', description: 'Aviation and Aerospace' },
  { name: 'AGRHI INNOVATORS CLUB', description: 'Agriculture and Innovation' },
  { name: 'ANDROID CLUB', description: 'App Development' },
  { name: 'ANIMATION CLUB', description: 'Animation and Multimedia' },
  { name: 'ANIME REALM', description: 'Anime Culture' },
  { name: 'ARIGNAR ANNA TAMIL MANDRAM', description: 'Tamil Literary Club' },
  { name: 'ARTIFICIAL INTELLIGENCE CLUB', description: 'AI & Machine Learning' },
  { name: 'ASME STUDENT CHAPTER', description: 'Mechanical Engineering' },
  { name: 'ATHENAEUM', description: 'Literary Club' },
  { name: 'AUTONOMOUS UNMANNED VEHICLE CLUB', description: 'Robotics and Drones' },
  { name: 'AUTOVIT', description: 'Automotive and Engineering' },
  { name: 'BENGALI LITERARY SOCIETY', description: 'Bengali Culture and Literature' },
  { name: 'Bionary', description: 'Biotechnology and Research' },
  { name: 'BIOSPHERE CLUB', description: 'Environment and Nature' },
  { name: 'BUSINESS INNOVATION COMMUNITY (BIC)', description: 'Business and Consulting' },
  { name: 'CAD CLUB', description: 'Design and CAD Modeling' },
  { name: 'CITTAA STUDENT CHAPTER', description: 'Information Technology' },
  { name: 'AUTO-VIT', description: 'Automotive Club' },
  { name: 'CIVITEK', description: 'Civil Engineering' },
  { name: 'CLOUD COMPUTING CLUB', description: 'Cloud Technologies' },
  { name: 'CODE Y-GEN', description: 'Coding Club' },
  { name: 'CODECHEF - VIT CHENNAI', description: 'Competitive Coding Chapter' },
  { name: 'CSED (VNEST)', description: 'Entrepreneurship and Incubation' },
  { name: 'CULINARY CLUB', description: 'Cooking and Culinary Arts' },
  { name: 'CULTURE IT', description: 'Cultural and Tech Hub' },
  { name: 'CYSCOM', description: 'Cyber Security Chapter' },
  { name: 'DANCE CLUB', description: 'Performing Arts - Dance' },
  { name: 'DAO COMMUNITY', description: 'Decentralized Web & Blockchain' },
  { name: 'DATA SCIENCE CLUB', description: 'Data Analytics and AI' },
  { name: 'DELISH CLUB', description: 'Culinary and Delicacies' },
  { name: 'DESIGNERS CLUB', description: 'UI/UX and Graphic Design' },
  { name: 'DRAMATICS CLUB', description: 'Theatre and Acting' },
  { name: 'DREAM MERCHANTS', description: 'Marketing and Finance' },
  { name: 'ENACTUS VIT CHENNAI', description: 'Social Entrepreneurship' },
  { name: "ENERGY AND FUEL USER'S ASSOCIATION (ENFUSE)", description: 'Energy Conservation' },
  { name: 'ENGLISH LITERARY ASSOCIATION', description: 'English Literature and Debating' },
  { name: 'ENTREPRENEURSHIP CELL (E-CELL)', description: 'Startups and Business' },
  { name: 'ENVIRONMENT & ENERGY PROTECTION CLUB (E2 PC)', description: 'Eco-friendly activities' },
  { name: 'EVENTS MANAGERS CLUB', description: 'Event Operations' },
  { name: 'FILMSOCIETY', description: 'Cinema and Film Appreciation' },
  { name: 'FINE ARTS CLUB (TFAC)', description: 'Fine Arts and Visuals' },
  { name: 'FITNESS CLUB', description: 'Sports and Physical Health' },
  { name: 'FRATERNITY OF LEADERS', description: 'Leadership Skills' },
  { name: 'FRATERNITY OF YOUNG INNOVATORS (FYI)', description: 'Innovation and Incubation' },
  { name: 'FRENCH CLUB', description: 'French Language and Culture' },
  { name: 'GAME DEVELOPMENT CLUB', description: 'Game Design and Development' },
  { name: 'GIRL UP', description: 'Women Empowerment Club' },
  { name: 'GOOGLE DEVELOPER GROUPS ON CAMPUS', description: 'Google Developer Technologies' },
  { name: 'GUJARATI LITERARY ASSOCIATION', description: 'Gujarati Culture' },
  { name: 'HARYANA HOOD', description: 'Haryanvi Culture' },
  { name: 'HAVOLTZ', description: 'Electrical and Electronic Projects' },
  { name: 'HEALTH CLUB', description: 'Healthcare Awareness' },
  { name: 'HINDI LITERARY ASSOCIATION', description: 'Hindi Literature and Dramatics' },
  { name: 'HUMANOID CLUB', description: 'Humanoid Robotics' },
  { name: 'IEEE COMPUTER SOCIETY (IEEE-CS)', description: 'Computing Chapter' },
  { name: 'IEEE ELECTRON DEVICES SOCIETY (IEEE-EDS)', description: 'Semiconductors and Devices' },
  { name: 'IEEE ENGINEERING IN MEDICINE AND BIOLOGY', description: 'Bio-medical Engineering' },
  { name: 'IEEE MICROWAVE THEORY AND TECHNOLOGY SOCIETY (IEEE-MTTS)', description: 'RF and Microwaves' },
  { name: 'IEEE PHOTONICS SOCIETY', description: 'Optics and Photonics' },
  { name: 'IEEE POWER AND ENERGY SOCIETY (IEEE-PES)', description: 'Power and Energy Systems' },
  { name: 'IEEE ROBOTICS & AUTOMATION SOCIETY (IEEE-RAS)', description: 'Automation and Robotics' },
  { name: 'IEEE SIGNAL PROCESSING SOCIETY (IEEE-SPS)', description: 'Signal Processing' },
  { name: 'IEEE SOLID STATE CIRCUITS SOCIETY (IEEE-SSCS)', description: 'IC Design and Circuits' },
  { name: 'IEEE VEHICULAR TECHNOLOGY SOCIETY (IEEE-VTS)', description: 'Vehicular Tech' },
  { name: 'IEEE WOMEN IN ENGINEERING (IEEE-WIE)', description: 'Women in Tech' },
  { name: 'INDIAN ASSOCIATION OF ENERGY MANAGEMENT PROFESSIONALS (IAEMP) STUDENT CHAPTER', description: 'Energy Auditing' },
  { name: 'INDIAN CONCRETE INSTITUTE STUDENT CHAPTER', description: 'Concrete and Civil Engineering' },
  { name: 'INSTITUTE ELECTRICAL & ELECTRONICS ENGINEERING (IEEE)', description: 'IEEE Student Branch' },
  { name: 'INTEGRATED CIRCUITS & SYSTEM DESIGN (ICSD)', description: 'Micro-electronics' },
  { name: 'INTERNET OF THINGS COMMUNITY (IOTHINC)', description: 'IoT Research and Projects' },
  { name: 'ISPACE', description: 'Astronomical and Space Club' },
  { name: 'JAPANESE CLUB', description: 'Japanese Culture and Language' },
  { name: 'KANNADA LITERARY ASSOCIATION', description: 'Kannada Culture and Literature' },
  { name: 'LINUX CLUB', description: 'Open Source and Linux Advocacy' },
  { name: 'MADHYA MILAN', description: 'Central India Cultural Association' },
  { name: 'MAGADH MITHILA CLUB', description: 'Bihar and Jharkhand Cultural Club' },
  { name: 'MALAYALAM LITERARY ASSOCIATION', description: 'Malayalam Culture' },
  { name: 'MARATHI LITERARY ASSOCIATION', description: 'Marathi Culture' },
  { name: 'MATHEMATICS CLUB', description: 'Mathematical sciences' },
  { name: 'MHARO RAJASTHAN', description: 'Rajasthani Culture' },
  { name: 'MICROSOFT INNOVATION CLUB', description: 'Microsoft Tech Stack' },
  { name: 'MUSIC CLUB', description: 'Cultural Performing Arts - Music' },
  { name: 'NAMAMI ASSAM', description: 'Assamese Culture' },
  { name: 'NATIONAL SERVICE SCHEME (NSS)', description: 'Community Service' },
  { name: 'NATURE LOVERS CLUB', description: 'Eco-preservation and Wildlife' },
  { name: 'NEWTON SCHOOL CODING CLUB', description: 'Tech Prep and Hackathons' },
  { name: 'NEXUS', description: 'Interdisciplinary Technical Projects' },
  { name: 'NUTRITION CLUB', description: 'Dietary Health and Wellness' },
  { name: 'ODIA LITERARY ASSOCIATION - KALINGA JYOTI', description: 'Odisha Culture' },
  { name: 'OPEN SOURCE PROGRAMMING CLUB', description: 'Open Source development' },
  { name: 'OPTICAL SOCIETY OF AMERICA', description: 'Optics and Lasers' },
  { name: 'PLACEXP', description: 'Placement and Career Guidance' },
  { name: 'POP CULTURE CLUB', description: 'Pop Culture Appreciation' },
  { name: 'PRODINNO', description: 'Design Thinking and Product Innovation' },
  { name: 'QUIZ CLUB', description: 'Trivia and Quizzing' },
  { name: 'RED RIBBON CLUB', description: 'Health and Social Awareness' },
  { name: 'RESOURCEXP', description: 'Academic and Project Resources' },
  { name: 'ROBOTICS CLUB', description: 'Robotic builds and microcontrollers' },
  { name: 'ROTARACT CLUB', description: 'Social service and Rotary network' },
  { name: 'SAE CLUB', description: 'Automobile Engineering Design' },
  { name: 'SAHAYATHA', description: 'Charitable Social Outreach' },
  { name: 'SANGAM CLUB (UTTAR PRADESH)', description: 'UP Cultural Association' },
  { name: 'SEDS ANTARIKSH CHAPTER', description: 'Space Exploration Chapter' },
  { name: 'SERAPHIC', description: 'Design and Aesthetics' },
  { name: 'SHORT FILM CLUB', description: 'Directing and screenwriting' },
  { name: 'SOCIETY OF AUTOMOTIVE ENGINEERS (SAE)', description: 'SAE Student Chapter' },
  { name: 'SOCRATES', description: 'Philosophical Debates and Philosophy' },
  { name: 'SPIE STUDENT CHAPTER', description: 'Photo-optical Instrumentation' },
  { name: 'SPORTS CLUB', description: 'Campus Athletics and Tournaments' },
  { name: 'TECH RESEARCHERS CLUB (TRC)', description: 'Research writing and journals' },
  { name: 'TEDX VIT CHENNAI', description: 'Independent TED events' },
  { name: 'TELUGU LITERARY ASSOCIATION', description: 'Telugu Culture' },
  { name: 'THE CAPSULE - VIT NEWSLETTER CLUB', description: 'Campus journalism and newsletter' },
  { name: 'THE COMEDY CLUB', description: 'Stand-up comedy and humor' },
  { name: 'THE HACK CLUB', description: 'Development and Programming' },
  { name: 'THE INDIAN SOCIETY OF HEATING, REFRIGERATING AND AIR CONDITIONING ENGINEERS (ISHRAE)', description: 'HVAC Engineering' },
  { name: 'THE PHOTOGRAPHY CLUB', description: 'Visual arts and photography' },
  { name: 'THE WHITE HELMETS', description: 'First Aid and Disaster Management' },
  { name: 'TOASTMASTERS INTERNATIONAL', description: 'Public speaking chapter' },
  { name: 'TREKKING CLUB', description: 'Outdoors and Mountaineering' },
  { name: 'UDDESHYA', description: 'Social welfare and literacy projects' },
  { name: 'VIRTUAL REALITY CLUB', description: 'AR/VR/MR Technologies' },
  { name: 'VIT FINANCE AND MANAGEMENT CLUB', description: 'Wealth management and finance' },
  { name: 'VITC DEBATE SOCIETY', description: 'VITC Debate Society' },
  { name: 'VITC FILM SOCIETY', description: 'VITC Film Society' },
  { name: 'VITEACH', description: 'Educational community outreach' },
  { name: 'VITFAM', description: 'Student community integration' },
  { name: 'VITSION FILM MAKERS CLUB', description: 'Script and video execution' },
  { name: 'VITSOL DEBATE SOCIETY', description: 'Law School Debating' },
  { name: "VOICE-IT VIT CHENNAI'S RADIO", description: 'VIT Chennai Podcast and Radio' },
  { name: 'WAKHRA PUNJAB', description: 'Punjabi Cultural Club' },
  { name: 'WOMAN DEVELOPMENT CELL', description: 'Gender equality initiatives' },
  { name: 'YOGA CLUB', description: 'Physical and mental wellness' },
  { name: 'YOUTH RED CROSS (YRC)', description: 'Red Cross Youth Chapter' },
  { name: 'YUVA', description: 'Social and Youth Leadership' },
  { name: 'ZERO BUGS CLUB', description: 'Debugging and clean code' },
];

/**
 * Idempotent seed — safe to call on cold start / health check.
 * Guarded so it does not re-seed when data already exists.
 */
export async function seedDatabase() {
  await connectDB();
  try {
    const adminUser = await db.users.findOne({ role: 'Admin' });
    if (!adminUser) {
      console.log('Seeding default Admin account...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      await db.users.create({
        name: 'VIT Admin',
        email: 'admin@vitchennai.edu.in',
        username: 'admin',
        passwordHash,
        role: 'Admin',
        designation: 'Portal Administrator',
      });
      console.log('Default Admin seeded (Username: admin, Password: admin123).');
    }

    const existingClubs = await db.clubs.find();
    if (existingClubs.length < 138) {
      console.log('Seeding initial VIT Chennai Clubs & Chapters...');
      for (const club of existingClubs) {
        await db.clubs.findByIdAndDelete(club.id || club._id);
      }
      for (const clubData of DEFAULT_CLUBS) {
        await db.clubs.create(clubData);
      }
      console.log('Seeded clubs successfully.');
    }
  } catch (error) {
    console.error('Database seeding error:', error);
  }
}

export { db, isMongo, connectDB };
