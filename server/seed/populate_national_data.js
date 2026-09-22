const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');

const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User.model');
const State = require('../models/State.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const Crop = require('../models/Crop.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const { ROLES, ROLE_LEVELS, ROLE_LABELS, DEFAULT_PASSWORD } = require('../utils/roleHierarchy');

async function populate() {
  console.log('🌱 Connecting to database...');
  await connectDB();

  // Find or verify Central Admin
  let centralAdmin = await User.findOne({ role: ROLES.CENTRAL_ADMIN });
  if (!centralAdmin) {
    centralAdmin = await User.create({
      name: 'Dr. Ramesh Kumar',
      mobile: '9000000001',
      email: 'central@kisanconnect.gov.in',
      password: 'Admin@123',
      role: ROLES.CENTRAL_ADMIN,
      level: ROLE_LEVELS[ROLES.CENTRAL_ADMIN],
      employeeId: 'CPO-001',
      isActive: true,
      mustChangePassword: false,
    });
    console.log('✅ Created Central Admin: CPO-001');
  } else {
    console.log(`ℹ️ Existing Central Admin: ${centralAdmin.name} (${centralAdmin.employeeId})`);
  }

  // Fetch all crops to associate with centres
  const crops = await Crop.find({ isActive: true });
  const cropIds = crops.map((c) => c._id);
  console.log(`🌾 Loaded ${crops.length} crops for centre association`);

  // ═══════════════════════════════════════════════════════════════
  // 1. STATES CONFIGURATION (15 Key Agricultural States)
  // ═══════════════════════════════════════════════════════════════
  const statesConfig = [
    {
      name: 'Punjab',
      code: 'PB',
      zone: 'North',
      officerName: 'Sardar Jaspreet Singh',
      mobile: '9100000001',
      email: 'punjab@kisanconnect.gov.in',
      description: 'Major producer of Wheat, Rice (Paddy), and Cotton in the Northern agrarian corridor.',
      districts: [
        {
          district: 'Ludhiana',
          code: 'LDH',
          officerName: 'Gurpreet Kaur Bajwa',
          mobile: '9200000001',
          email: 'dno.ludhiana@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-LDH-001',
            name: 'Ludhiana Main Procurement Centre',
            address: 'Grain Market, Near Bus Stand, Ludhiana',
            pincode: '141001',
            contactPhone: '0161-2345678',
            dailyCapacity: 180,
            facilities: ['Weighing Bridge', 'Storage Facility', 'Waiting Area', 'Drinking Water', 'Restrooms'],
          },
        },
        {
          district: 'Amritsar',
          code: 'AMR',
          officerName: 'Harmanpreet Singh Gill',
          mobile: '9200000002',
          email: 'dno.amritsar@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-AMR-001',
            name: 'Amritsar Central Mandi',
            address: 'Mandi Complex, GT Road, Amritsar',
            pincode: '143001',
            contactPhone: '0183-2567890',
            dailyCapacity: 150,
            facilities: ['Weighing Machine', 'Cold Storage', 'ATM', 'Canteen'],
          },
        },
        {
          district: 'Patiala',
          code: 'PTL',
          officerName: 'Navjot Singh Sidhu',
          mobile: '9200000003',
          email: 'dno.patiala@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-PTL-001',
            name: 'Patiala District Procurement Centre',
            address: 'Old Mandi Road, Rajpura, Patiala',
            pincode: '147001',
            contactPhone: '0175-2234567',
            dailyCapacity: 200,
            facilities: ['Automated Weighing', 'Large Waiting Area', 'Solar Shade', 'Medical Aid'],
          },
        },
        {
          district: 'Bathinda',
          code: 'BTI',
          officerName: 'Baldev Singh Sidhu',
          mobile: '9200000004',
          email: 'dno.bathinda@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-BTI-001',
            name: 'Bathinda Grain Terminal',
            address: 'Mandi Yard, Goniana Road, Bathinda',
            pincode: '151001',
            contactPhone: '0164-2223344',
            dailyCapacity: 160,
            facilities: ['Weighing Bridge', 'Covered Sheds', 'Farmer Helpdesk', 'Canteen'],
          },
        },
      ],
    },
    {
      name: 'Haryana',
      code: 'HR',
      zone: 'North',
      officerName: 'Shri Vikramaditya Hooda',
      mobile: '9100000003',
      email: 'haryana@kisanconnect.gov.in',
      description: 'Extensive agricultural mandi network handling Wheat, Mustard, Paddy, and Pulses.',
      districts: [
        {
          district: 'Karnal',
          code: 'KRN',
          officerName: 'Dr. Virender Phogat',
          mobile: '9200000011',
          email: 'dno.karnal@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-KRN-001',
            name: 'Karnal Central APMC Mandi',
            address: 'New Anaj Mandi, Sector 3, Karnal',
            pincode: '132001',
            contactPhone: '0184-2256789',
            dailyCapacity: 220,
            facilities: ['Electronic Weighing Bridge', 'Soil Testing Lab', 'Farmer Rest House', 'Solar Canopy'],
          },
        },
        {
          district: 'Kurukshetra',
          code: 'KRK',
          officerName: 'Smt. Sunita Malik',
          mobile: '9200000012',
          email: 'dno.kurukshetra@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-KRK-001',
            name: 'Kurukshetra Anaj Mandi',
            address: 'Pipli Road, Thanesar, Kurukshetra',
            pincode: '136118',
            contactPhone: '01744-234567',
            dailyCapacity: 140,
            facilities: ['Digital Moisture Meter', 'Large Waiting Area', 'Banking Kiosk'],
          },
        },
        {
          district: 'Sirsa',
          code: 'SRS',
          officerName: 'Ajaypal Singh Kanda',
          mobile: '9200000013',
          email: 'dno.sirsa@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-SRS-001',
            name: 'Sirsa Cotton & Wheat Mandi',
            address: 'Dabwali Road, Sirsa',
            pincode: '125055',
            contactPhone: '01666-245678',
            dailyCapacity: 175,
            facilities: ['Cotton Ginning Link', 'Heavy Weighbridge', 'Drinking Water Station'],
          },
        },
        {
          district: 'Ambala',
          code: 'AMB',
          officerName: 'Rajinder Kumar Sharma',
          mobile: '9200000014',
          email: 'dno.ambala@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-AMB-001',
            name: 'Ambala Cantt Mandi Yard',
            address: 'Near Railway Station, Ambala Cantt',
            pincode: '133001',
            contactPhone: '0171-2645678',
            dailyCapacity: 130,
            facilities: ['Weighing Bridge', 'Farmer Rest Shed', '24/7 Power Backup'],
          },
        },
      ],
    },
    {
      name: 'Uttar Pradesh',
      code: 'UP',
      zone: 'North',
      officerName: 'Rajeshwar Nath Shahi',
      mobile: '9100000004',
      email: 'up@kisanconnect.gov.in',
      description: 'The largest food grain producing state, supporting millions of small and marginal farmers.',
      districts: [
        {
          district: 'Meerut',
          code: 'MRT',
          officerName: 'Praveen Chandra Tyagi',
          mobile: '9200000021',
          email: 'dno.meerut@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-MRT-001',
            name: 'Meerut Kisan Mandi Complex',
            address: 'Delhi Road, Partapur, Meerut',
            pincode: '250103',
            contactPhone: '0121-2512345',
            dailyCapacity: 250,
            facilities: ['Multi-lane Weighbridge', 'Grain Quality Lab', 'Restrooms', 'Cafeteria'],
          },
        },
        {
          district: 'Varanasi',
          code: 'VNS',
          officerName: 'Dr. Anand Bhushan Mishra',
          mobile: '9200000022',
          email: 'dno.varanasi@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-VNS-001',
            name: 'Varanasi Kashi Krishi Mandi',
            address: 'Panchkroshi Road, Shivpur, Varanasi',
            pincode: '221003',
            contactPhone: '0542-2287654',
            dailyCapacity: 190,
            facilities: ['Covered Platform', 'Digital Quality Testing', 'ATM', 'Helpdesk'],
          },
        },
        {
          district: 'Gorakhpur',
          code: 'GKP',
          officerName: 'Sanjay Kumar Maurya',
          mobile: '9200000023',
          email: 'dno.gorakhpur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-GKP-001',
            name: 'Gorakhpur Mandi Centre',
            address: 'Maudha Road, Near Transport Nagar, Gorakhpur',
            pincode: '273001',
            contactPhone: '0551-2334455',
            dailyCapacity: 180,
            facilities: ['Automated Weighing', 'Grain Storage Godown', 'Doctor on Call'],
          },
        },
        {
          district: 'Agra',
          code: 'AGR',
          officerName: 'Dileep Singh Yadav',
          mobile: '9200000024',
          email: 'dno.agra@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-AGR-001',
            name: 'Agra Mandi Parishad Yard',
            address: 'Fatehabad Road, Tajganj, Agra',
            pincode: '282001',
            contactPhone: '0562-2467890',
            dailyCapacity: 170,
            facilities: ['Dual Weighing Bridges', 'Kisan Bhavan', 'Solar Sheds'],
          },
        },
        {
          district: 'Bareilly',
          code: 'BRL',
          officerName: 'Rakesh Ranjan Srivastava',
          mobile: '9200000025',
          email: 'dno.bareilly@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-BRL-001',
            name: 'Bareilly Delapeer Mandi Yard',
            address: 'Delapeer, Pilibhit Bypass Road, Bareilly',
            pincode: '243005',
            contactPhone: '0581-2556677',
            dailyCapacity: 160,
            facilities: ['Electronic Scale', 'Seed & Fertilizer Outlet', 'Waiting Lounge'],
          },
        },
      ],
    },
    {
      name: 'Madhya Pradesh',
      code: 'MP',
      zone: 'Central',
      officerName: 'Shri Dinesh Verma',
      mobile: '9100000002',
      email: 'mp@kisanconnect.gov.in',
      description: 'Hub for Soybean, Wheat, Gram, and Mustard with robust Bhavantar and MSP procurement.',
      districts: [
        {
          district: 'Bhopal',
          code: 'BPL',
          officerName: 'Maheshwar Dayal Shukla',
          mobile: '9200000031',
          email: 'dno.bhopal@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-BPL-001',
            name: 'Bhopal Berasia Procurement Yard',
            address: 'Karond Mandi Complex, Berasia Road, Bhopal',
            pincode: '462038',
            contactPhone: '0755-2745678',
            dailyCapacity: 200,
            facilities: ['Smart Weighbridge', 'E-Choupal Kiosk', 'Shaded Vehicle Queue', 'Canteen'],
          },
        },
        {
          district: 'Indore',
          code: 'IND',
          officerName: 'Sudhir Kumar Patidar',
          mobile: '9200000032',
          email: 'dno.indore@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-IND-001',
            name: 'Indore Laxmibai Nagar Grain Mandi',
            address: 'Laxmibai Nagar Mandi, Sanwer Road, Indore',
            pincode: '452006',
            contactPhone: '0731-2412345',
            dailyCapacity: 240,
            facilities: ['Fully Automated Weighing', 'Grain Moisture Analyzer', 'Kisan Rest Room', 'Banking Counter'],
          },
        },
        {
          district: 'Ujjain',
          code: 'UJN',
          officerName: 'Anurag Sharma',
          mobile: '9200000033',
          email: 'dno.ujjain@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-UJN-001',
            name: 'Ujjain Krishi Mandi Parishad',
            address: 'Maksi Road, Ujjain',
            pincode: '456010',
            contactPhone: '0734-2523456',
            dailyCapacity: 180,
            facilities: ['Electronic Weighbridge', 'Moisture Testing Lab', 'Free Drinking Water'],
          },
        },
        {
          district: 'Hoshangabad',
          code: 'HSH',
          officerName: 'Devendra Pratap Rajput',
          mobile: '9200000034',
          email: 'dno.hoshangabad@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-HSH-001',
            name: 'Hoshangabad Narmadapuram Mandi',
            address: 'Itarsi Road, Narmadapuram, Hoshangabad',
            pincode: '461001',
            contactPhone: '07574-253456',
            dailyCapacity: 210,
            facilities: ['Wheat Cleaning Equipment', 'Heavy Weighbridge', 'Restrooms'],
          },
        },
      ],
    },
    {
      name: 'Rajasthan',
      code: 'RJ',
      zone: 'West',
      officerName: 'Manvendra Singh Rathore',
      mobile: '9100000005',
      email: 'rajasthan@kisanconnect.gov.in',
      description: 'Premier zone for Mustard, Gram, Bajra, and Wheat procurement in western India.',
      districts: [
        {
          district: 'Kota',
          code: 'KTA',
          officerName: 'Bhanwar Lal Meena',
          mobile: '9200000041',
          email: 'dno.kota@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-KTA-001',
            name: 'Kota Bhamashah Mandi Yard',
            address: 'Anantpura, Jhalawar Road, Kota',
            pincode: '324005',
            contactPhone: '0744-2489012',
            dailyCapacity: 220,
            facilities: ['Digital Weighing Bridge', 'Storage Sheds', 'Farmer Helpdesk', 'Canteen'],
          },
        },
        {
          district: 'Jaipur',
          code: 'JPR',
          officerName: 'Hanuman Prasad Chaudhary',
          mobile: '9200000042',
          email: 'dno.jaipur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-JPR-001',
            name: 'Jaipur Surajpole Krishi Mandi',
            address: 'Surajpole Mandi, Transport Nagar, Jaipur',
            pincode: '302003',
            contactPhone: '0141-2601234',
            dailyCapacity: 190,
            facilities: ['Automatic Moisture Check', 'Spacious Truck Parking', 'Rest House'],
          },
        },
        {
          district: 'Sri Ganganagar',
          code: 'SGN',
          officerName: 'Kulwant Singh Dhillon',
          mobile: '9200000043',
          email: 'dno.ganganagar@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-SGN-001',
            name: 'Sri Ganganagar Grain Terminal',
            address: 'Suratgarh Road, Sri Ganganagar',
            pincode: '335001',
            contactPhone: '0154-2475678',
            dailyCapacity: 200,
            facilities: ['Grain Quality Lab', 'Weighbridge', 'Banking Kiosk'],
          },
        },
      ],
    },
    {
      name: 'Maharashtra',
      code: 'MH',
      zone: 'West',
      officerName: 'Sanjay Baburao Deshmukh',
      mobile: '9100000006',
      email: 'maharashtra@kisanconnect.gov.in',
      description: 'Extensive agricultural marketing network handling Soybean, Cotton, Gram, and Millets.',
      districts: [
        {
          district: 'Nashik',
          code: 'NSK',
          officerName: 'Chandrakant Bhaurao Patil',
          mobile: '9200000051',
          email: 'dno.nashik@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-NSK-001',
            name: 'Nashik Dindori APMC Mandi',
            address: 'Peth Road, Panchavati, Nashik',
            pincode: '422003',
            contactPhone: '0253-2514567',
            dailyCapacity: 200,
            facilities: ['Cold Storage Units', 'Digital Weighbridge', 'Farmer Rest House'],
          },
        },
        {
          district: 'Pune',
          code: 'PUN',
          officerName: 'Sachin Anant Gaikwad',
          mobile: '9200000052',
          email: 'dno.pune@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-PUN-001',
            name: 'Pune Gultekdi Market Yard',
            address: 'Gultekdi, Swargate, Pune',
            pincode: '411037',
            contactPhone: '020-24261234',
            dailyCapacity: 230,
            facilities: ['Multiple Weighbridges', 'Automated Grading Lab', 'Cafeteria'],
          },
        },
        {
          district: 'Nagpur',
          code: 'NGP',
          officerName: 'Pramod Wasudeo Bhende',
          mobile: '9200000053',
          email: 'dno.nagpur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-NGP-001',
            name: 'Nagpur Kalamna Grain Terminal',
            address: 'Kalamna Market Yard, Nagpur',
            pincode: '440026',
            contactPhone: '0712-2681234',
            dailyCapacity: 190,
            facilities: ['Heavy Commercial Weighbridge', 'Cotton Testing', 'Grain Warehouses'],
          },
        },
      ],
    },
    {
      name: 'Gujarat',
      code: 'GJ',
      zone: 'West',
      officerName: 'Bhavesh Chhaganbhai Patel',
      mobile: '9100000007',
      email: 'gujarat@kisanconnect.gov.in',
      description: 'Major cotton, groundnut, mustard, and wheat trading network through APMCs.',
      districts: [
        {
          district: 'Rajkot',
          code: 'RJK',
          officerName: 'Hiteshbhai Jayantibhai Dholakia',
          mobile: '9200000061',
          email: 'dno.rajkot@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-RJK-001',
            name: 'Rajkot APMC Bedi Market Yard',
            address: 'Morbi Bypass Road, Bedi, Rajkot',
            pincode: '360003',
            contactPhone: '0281-2701234',
            dailyCapacity: 220,
            facilities: ['Fully Computerized Weighing', 'Electronic Auction Screen', 'Farmer Lounge'],
          },
        },
        {
          district: 'Ahmedabad',
          code: 'AHM',
          officerName: 'Kiritbhai Manilal Vaghela',
          mobile: '9200000062',
          email: 'dno.ahmedabad@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-AHM-001',
            name: 'Ahmedabad Jamalpur Grain Mandi',
            address: 'Near Sardar Bridge, Jamalpur, Ahmedabad',
            pincode: '380022',
            contactPhone: '079-25391234',
            dailyCapacity: 180,
            facilities: ['Digital Moisture Meter', 'Covered Platforms', 'Banking Kiosk'],
          },
        },
      ],
    },
    {
      name: 'Bihar',
      code: 'BR',
      zone: 'East',
      officerName: 'Anirudh Kumar Jha',
      mobile: '9100000008',
      email: 'bihar@kisanconnect.gov.in',
      description: 'PACS and state procurement centres handling Maize, Paddy, and Wheat crops.',
      districts: [
        {
          district: 'Patna',
          code: 'PAT',
          officerName: 'Dhirendra Mohan Singh',
          mobile: '9200000071',
          email: 'dno.patna@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-PAT-001',
            name: 'Patna Musallahpur Fasal Mandi',
            address: 'Musallahpur Mandi Yard, Patna',
            pincode: '800006',
            contactPhone: '0612-2301234',
            dailyCapacity: 170,
            facilities: ['Electronic Weighing', 'Grain Storage Sheds', 'Farmer Help Desk'],
          },
        },
        {
          district: 'Muzaffarpur',
          code: 'MUZ',
          officerName: 'Pankaj Kumar Thakur',
          mobile: '9200000072',
          email: 'dno.muzaffarpur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-MUZ-001',
            name: 'Muzaffarpur Saraiya Krishi Yard',
            address: 'Rewa Road, Saraiya, Muzaffarpur',
            pincode: '843126',
            contactPhone: '0621-2245678',
            dailyCapacity: 140,
            facilities: ['Digital Scales', 'Covered Waiting Hall', 'Drinking Water'],
          },
        },
      ],
    },
    {
      name: 'West Bengal',
      code: 'WB',
      zone: 'East',
      officerName: 'Subhashish Mukherjee',
      mobile: '9100000009',
      email: 'westbengal@kisanconnect.gov.in',
      description: 'Primary Paddy (Rice), Maize, and Potato producing state in Eastern India.',
      districts: [
        {
          district: 'Purba Bardhaman',
          code: 'BDN',
          officerName: 'Sourav Ganguly Sen',
          mobile: '9200000081',
          email: 'dno.bardhaman@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-BDN-001',
            name: 'Bardhaman Rice Bowl Mandi',
            address: 'GT Road, Burdwan Central, Purba Bardhaman',
            pincode: '713101',
            contactPhone: '0342-2661234',
            dailyCapacity: 210,
            facilities: ['Paddy Drying Yard', 'Digital Moisture Tester', 'Rest Shelter'],
          },
        },
      ],
    },
    {
      name: 'Andhra Pradesh',
      code: 'AP',
      zone: 'South',
      officerName: 'Venkat Subba Reddy',
      mobile: '9100000010',
      email: 'andhra@kisanconnect.gov.in',
      description: 'Rythu Bharosa Kendras and APMC yards procuring Paddy, Maize, Cotton, and Pulses.',
      districts: [
        {
          district: 'Guntur',
          code: 'GNT',
          officerName: 'K. Srinivasa Rao',
          mobile: '9200000091',
          email: 'dno.guntur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-GNT-001',
            name: 'Guntur Mirchi & Grain Mandi',
            address: 'Koretipadu, Guntur Mandi Yard, Guntur',
            pincode: '522007',
            contactPhone: '0863-2231234',
            dailyCapacity: 230,
            facilities: ['Automatic Moisture Analyzer', 'Heavy Weighbridge', 'Cold Storages'],
          },
        },
      ],
    },
    {
      name: 'Karnataka',
      code: 'KA',
      zone: 'South',
      officerName: 'Basavaraj Channappa Gowda',
      mobile: '9100000015',
      email: 'karnataka@kisanconnect.gov.in',
      description: 'RMP & APMC Unified Market Platform for Maize, Cotton, Pulses, and Cereals.',
      districts: [
        {
          district: 'Dharwad',
          code: 'DHD',
          officerName: 'Mallikarjun Patil',
          mobile: '9200000092',
          email: 'dno.dharwad@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-DHD-001',
            name: 'Hubballi-Dharwad APMC Terminal',
            address: 'Amargol Market Yard, Hubballi, Dharwad',
            pincode: '580025',
            contactPhone: '0836-2221234',
            dailyCapacity: 190,
            facilities: ['Electronic Weighbridge', 'Farmer Bhavan', 'Quality Assay Lab'],
          },
        },
      ],
    },
    {
      name: 'Tamil Nadu',
      code: 'TN',
      zone: 'South',
      officerName: 'Dr. K. Sundaramoorthy',
      mobile: '9100000016',
      email: 'tamilnadu@kisanconnect.gov.in',
      description: 'Direct Purchase Centres (DPC) and Regulated Market Committees across Delta & Central districts.',
      districts: [
        {
          district: 'Thanjavur',
          code: 'TNJ',
          officerName: 'M. Selvakumar',
          mobile: '9200000093',
          email: 'dno.thanjavur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-TNJ-001',
            name: 'Thanjavur Delta Direct Purchase Centre',
            address: 'Kumbakonam Road, Thanjavur',
            pincode: '613001',
            contactPhone: '04362-234567',
            dailyCapacity: 180,
            facilities: ['Direct Paddy Procurement Deck', 'Moisture Meters', 'Rest Shed'],
          },
        },
      ],
    },
    {
      name: 'Odisha',
      code: 'OD',
      zone: 'East',
      officerName: 'Biswanath Patnaik',
      mobile: '9100000017',
      email: 'odisha@kisanconnect.gov.in',
      description: 'Extensive RMC Mandis procuring Paddy, Pulses, and Maize in Eastern coastal belt.',
      districts: [
        {
          district: 'Bargarh',
          code: 'BGR',
          officerName: 'Pradeep Kumar Sahoo',
          mobile: '9200000094',
          email: 'dno.bargarh@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-BGR-001',
            name: 'Bargarh RMC Grain Mandi',
            address: 'RMC Yard, Canal Road, Bargarh',
            pincode: '768028',
            contactPhone: '06646-231234',
            dailyCapacity: 190,
            facilities: ['Electronic Weighbridge', 'Paddy Cleaning Machines', 'Helpdesk'],
          },
        },
      ],
    },
    {
      name: 'Chhattisgarh',
      code: 'CG',
      zone: 'Central',
      officerName: 'Raman Prasad Baghel',
      mobile: '9100000018',
      email: 'chhattisgarh@kisanconnect.gov.in',
      description: 'Known as the Rice Bowl of Central India, operating extensive Cooperatives and Mandis.',
      districts: [
        {
          district: 'Raipur',
          code: 'RPR',
          officerName: 'Hemant Kumar Verma',
          mobile: '9200000095',
          email: 'dno.raipur@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-RPR-001',
            name: 'Raipur Krishi Upaj Mandi Terminal',
            address: 'Pandri, Raipur',
            pincode: '492004',
            contactPhone: '0771-2421234',
            dailyCapacity: 220,
            facilities: ['Computerized Weighing', 'Grain Storage Silos', 'Rest Rooms'],
          },
        },
      ],
    },
    {
      name: 'Telangana',
      code: 'TS',
      zone: 'South',
      officerName: 'M. Srinivas Rao',
      mobile: '9100000019',
      email: 'telangana@kisanconnect.gov.in',
      description: 'Modern agricultural market network for Cotton, Paddy, Maize, and Red Gram.',
      districts: [
        {
          district: 'Warangal Urban',
          code: 'WGL',
          officerName: 'Ch. Madhusudhan Reddy',
          mobile: '9200000096',
          email: 'dno.warangal@kisanconnect.gov.in',
          centre: {
            centreId: 'KPC-WGL-001',
            name: 'Warangal Cotton & Grain Enam Yard',
            address: 'Enumamula Market Yard, Warangal',
            pincode: '506006',
            contactPhone: '0870-2441234',
            dailyCapacity: 250,
            facilities: ['Asia second largest grain yard', 'Automated Weighing', 'E-NAM Terminal', 'Dormitories'],
          },
        },
      ],
    },
  ];

  console.log(`\n🏢 Processing ${statesConfig.length} States, Districts, Centres, and Officers...`);

  let statesCount = 0;
  let dnoCount = 0;
  let centreCount = 0;
  let officerCount = 0;

  for (const stConf of statesConfig) {
    // 1. Check or Create State Officer (Level 2)
    let stateOfficer = await User.findOne({ mobile: stConf.mobile });
    const empStateId = `SPO-${stConf.code}-001`;

    if (!stateOfficer) {
      stateOfficer = await User.create({
        name: stConf.officerName,
        mobile: stConf.mobile,
        email: stConf.email,
        password: DEFAULT_PASSWORD,
        role: ROLES.STATE_OFFICER,
        level: ROLE_LEVELS[ROLES.STATE_OFFICER],
        employeeId: empStateId,
        parentId: centralAdmin._id,
        state: stConf.name,
        department: 'Administration & Nodal Department',
        departmentRole: 'State Nodal Officer',
        isActive: true,
        mustChangePassword: false,
      });
      officerCount++;
    } else {
      stateOfficer.employeeId = empStateId;
      stateOfficer.state = stConf.name;
      await stateOfficer.save();
    }

    // Ensure OfficerProfile exists for State Officer
    let spoProfile = await OfficerProfile.findOne({ userId: stateOfficer._id });
    if (!spoProfile) {
      spoProfile = await OfficerProfile.create({
        userId: stateOfficer._id,
        employeeId: empStateId,
        designation: 'State Procurement / Nodal Officer',
        state: stConf.name,
        district: '',
      });
    }

    // 2. Upsert State record
    let stateRecord = await State.findOne({ name: stConf.name });
    if (!stateRecord) {
      stateRecord = await State.create({
        name: stConf.name,
        code: stConf.code,
        zone: stConf.zone,
        nodalHeadId: stateOfficer._id,
        nodalHeadName: stateOfficer.name,
        nodalHeadMobile: stateOfficer.mobile,
        nodalHeadEmail: stateOfficer.email,
        description: stConf.description,
        isActive: true,
      });
      statesCount++;
      console.log(`  🏛️ Added State: ${stConf.name} (${stConf.code}) — SPO: ${stateOfficer.name}`);
    } else {
      stateRecord.code = stConf.code;
      stateRecord.zone = stConf.zone;
      stateRecord.nodalHeadId = stateOfficer._id;
      stateRecord.nodalHeadName = stateOfficer.name;
      stateRecord.nodalHeadMobile = stateOfficer.mobile;
      stateRecord.nodalHeadEmail = stateOfficer.email;
      stateRecord.description = stConf.description;
      await stateRecord.save();
    }

    // 3. Process Districts & Centres
    let distSeq = 1;
    for (const distConf of stConf.districts) {
      // 3a. District Nodal Officer (Level 3)
      const dnoEmpId = `DNO-${distConf.code}-001`;
      let dno = await User.findOne({ mobile: distConf.mobile });
      if (!dno) {
        dno = await User.create({
          name: distConf.officerName,
          mobile: distConf.mobile,
          email: distConf.email,
          password: DEFAULT_PASSWORD,
          role: ROLES.DISTRICT_OFFICER,
          level: ROLE_LEVELS[ROLES.DISTRICT_OFFICER],
          employeeId: dnoEmpId,
          parentId: stateOfficer._id,
          state: stConf.name,
          district: distConf.district,
          department: 'Procurement & Mandi Board',
          departmentRole: 'District Nodal Officer',
          isActive: true,
          mustChangePassword: false,
        });
        officerCount++;
      } else {
        dno.employeeId = dnoEmpId;
        dno.state = stConf.name;
        dno.district = distConf.district;
        await dno.save();
      }

      let dnoProfile = await OfficerProfile.findOne({ userId: dno._id });
      if (!dnoProfile) {
        dnoProfile = await OfficerProfile.create({
          userId: dno._id,
          employeeId: dnoEmpId,
          designation: ROLE_LABELS[ROLES.DISTRICT_OFFICER],
          state: stConf.name,
          district: distConf.district,
        });
      }
      dnoCount++;

      // 3b. Procurement Centre
      const c = distConf.centre;
      let centre = await ProcurementCentre.findOne({ centreId: c.centreId });
      if (!centre) {
        centre = await ProcurementCentre.create({
          centreId: c.centreId,
          name: c.name,
          address: c.address,
          district: distConf.district,
          state: stConf.name,
          pincode: c.pincode,
          contactPhone: c.contactPhone,
          contactEmail: `mandi.${distConf.code.toLowerCase()}@kisanconnect.gov.in`,
          operatingHours: { start: '09:00', end: '17:00' },
          dailyCapacity: c.dailyCapacity || 150,
          slotDurationMinutes: 60,
          avgServiceTimeMinutes: 8,
          cancellationCutoffHours: 12,
          availableCrops: cropIds,
          officerIds: [],
          eligibilityDistricts: [distConf.district],
          isActive: true,
          description: `Authorized government procurement centre serving farmers in ${distConf.district}, ${stConf.name}.`,
          facilities: c.facilities || ['Weighing Bridge', 'Storage Shed', 'Drinking Water'],
        });
        centreCount++;
        console.log(`    🏢 Added Centre: ${c.name} (${c.centreId}) in ${distConf.district}`);
      } else {
        centre.availableCrops = cropIds;
        if (!centre.facilities || centre.facilities.length === 0) centre.facilities = c.facilities;
        await centre.save();
      }

      // 3c. Centre Head (Level 4)
      const pchEmpId = `PCH-${distConf.code}-001`;
      const pchMobile = `93${stConf.code.charCodeAt(0).toString().slice(-2)}${String(distSeq).padStart(2, '0')}001`.slice(0, 10);
      let pch = await User.findOne({ employeeId: pchEmpId });
      if (!pch) {
        pch = await User.create({
          name: `Officer ${distConf.district} Head`,
          mobile: pchMobile,
          email: `pch.${distConf.code.toLowerCase()}@kisanconnect.gov.in`,
          password: DEFAULT_PASSWORD,
          role: ROLES.CENTRE_HEAD,
          level: ROLE_LEVELS[ROLES.CENTRE_HEAD],
          employeeId: pchEmpId,
          parentId: dno._id,
          state: stConf.name,
          district: distConf.district,
          centreId: centre._id,
          isActive: true,
          mustChangePassword: false,
        });
        officerCount++;
      }
      let pchProfile = await OfficerProfile.findOne({ userId: pch._id });
      if (!pchProfile) {
        pchProfile = await OfficerProfile.create({
          userId: pch._id,
          centreId: centre._id,
          employeeId: pchEmpId,
          designation: ROLE_LABELS[ROLES.CENTRE_HEAD],
          state: stConf.name,
          district: distConf.district,
        });
      }

      // 3d. Procurement Officer (Level 5)
      const poEmpId = `PO-${distConf.code}-001`;
      const poMobile = `98${stConf.code.charCodeAt(0).toString().slice(-2)}${String(distSeq).padStart(2, '0')}002`.slice(0, 10);
      let po = await User.findOne({ employeeId: poEmpId });
      if (!po) {
        po = await User.create({
          name: `Procurement Officer (${distConf.district})`,
          mobile: poMobile,
          email: `po.${distConf.code.toLowerCase()}@kisanconnect.gov.in`,
          password: DEFAULT_PASSWORD,
          role: ROLES.PROCUREMENT_OFFICER,
          level: ROLE_LEVELS[ROLES.PROCUREMENT_OFFICER],
          employeeId: poEmpId,
          parentId: pch._id,
          state: stConf.name,
          district: distConf.district,
          centreId: centre._id,
          isActive: true,
          mustChangePassword: false,
        });
        officerCount++;
      }
      let poProfile = await OfficerProfile.findOne({ userId: po._id });
      if (!poProfile) {
        poProfile = await OfficerProfile.create({
          userId: po._id,
          centreId: centre._id,
          employeeId: poEmpId,
          designation: ROLE_LABELS[ROLES.PROCUREMENT_OFFICER],
          state: stConf.name,
          district: distConf.district,
        });
      }

      // 3e. Quality & Weighing Staff (Level 5)
      const qwsEmpId = `QWS-${distConf.code}-001`;
      const qwsMobile = `98${stConf.code.charCodeAt(0).toString().slice(-2)}${String(distSeq).padStart(2, '0')}003`.slice(0, 10);
      let qws = await User.findOne({ employeeId: qwsEmpId });
      if (!qws) {
        qws = await User.create({
          name: `Quality Incharge (${distConf.district})`,
          mobile: qwsMobile,
          email: `qws.${distConf.code.toLowerCase()}@kisanconnect.gov.in`,
          password: DEFAULT_PASSWORD,
          role: ROLES.QUALITY_STAFF,
          level: ROLE_LEVELS[ROLES.QUALITY_STAFF],
          employeeId: qwsEmpId,
          parentId: pch._id,
          state: stConf.name,
          district: distConf.district,
          centreId: centre._id,
          isActive: true,
          mustChangePassword: false,
        });
        officerCount++;
      }
      let qwsProfile = await OfficerProfile.findOne({ userId: qws._id });
      if (!qwsProfile) {
        qwsProfile = await OfficerProfile.create({
          userId: qws._id,
          centreId: centre._id,
          employeeId: qwsEmpId,
          designation: ROLE_LABELS[ROLES.QUALITY_STAFF],
          state: stConf.name,
          district: distConf.district,
        });
      }

      // 3f. Gate / Verification Staff (Level 6)
      const gvsEmpId = `GVS-${distConf.code}-001`;
      const gvsMobile = `98${stConf.code.charCodeAt(0).toString().slice(-2)}${String(distSeq).padStart(2, '0')}004`.slice(0, 10);
      let gvs = await User.findOne({ employeeId: gvsEmpId });
      if (!gvs) {
        gvs = await User.create({
          name: `Gate Operator (${distConf.district})`,
          mobile: gvsMobile,
          email: `gvs.${distConf.code.toLowerCase()}@kisanconnect.gov.in`,
          password: DEFAULT_PASSWORD,
          role: ROLES.GATE_STAFF,
          level: ROLE_LEVELS[ROLES.GATE_STAFF],
          employeeId: gvsEmpId,
          parentId: pch._id,
          state: stConf.name,
          district: distConf.district,
          centreId: centre._id,
          isActive: true,
          mustChangePassword: false,
        });
        officerCount++;
      }
      let gvsProfile = await OfficerProfile.findOne({ userId: gvs._id });
      if (!gvsProfile) {
        gvsProfile = await OfficerProfile.create({
          userId: gvs._id,
          centreId: centre._id,
          employeeId: gvsEmpId,
          designation: ROLE_LABELS[ROLES.GATE_STAFF],
          state: stConf.name,
          district: distConf.district,
        });
      }

      // Link all assigned staff in centre's officerIds
      const assignedIds = [pch._id, po._id, qws._id, gvs._id];
      await ProcurementCentre.findByIdAndUpdate(centre._id, {
        $addToSet: { officerIds: { $each: assignedIds } },
      });

      distSeq++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🎉 POPULATION COMPLETE!`);
  console.log(`   States Processed:     ${statesConfig.length}`);
  console.log(`   Total States in DB:   ${await State.countDocuments({})}`);
  console.log(`   Total Centres in DB:  ${await ProcurementCentre.countDocuments({})}`);
  console.log(`   Total Officers in DB: ${await User.countDocuments({ role: { $in: Object.values(ROLES).filter(r => r !== ROLES.FARMER) } })}`);
  console.log(`   Total Profiles in DB: ${await OfficerProfile.countDocuments({})}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  await closeDB();
}

populate().catch((err) => {
  console.error('❌ Error populating national data:', err);
  process.exit(1);
});
