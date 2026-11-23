function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatPrettyDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

const CATEGORIES = {
  'latest-jobs': {
    name: 'Latest Jobs',
    slug: 'latest-jobs',
    color: '#ab183d',
    icon: '💼',
    badge: 'Live Recruitment Updates',
    headline: 'Latest Government Jobs & Recruitment Notifications 2026',
    introEn: 'Welcome to Govt Exam Zone — your dedicated source for verified government job notifications across India. Stay informed about the latest Central and State Government vacancies, online application procedures, eligibility criteria, and last dates to apply. Whether you are preparing for UPSC, SSC, Railway (RRB), Banking, Defence, Teaching, or State Police recruitment, our editorial desk cross-checks all circulars directly with official government gazettes to deliver authentic, timely alerts.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। भारत भर में केंद्र एवं राज्य सरकार द्वारा जारी सभी नवीनतम सरकारी नौकरियों (Sarkari Naukri) की सटीक और समयबद्ध जानकारी यहां प्राप्त करें। चाहे आप UPSC, SSC, रेलवे भर्ती बोर्ड (RRB), बैंकिंग, पुलिस या शिक्षक भर्ती की तैयारी कर रहे हों, हमारी समर्पित टीम आधिकारिक रोजगार समाचार और विभागीय वेबसाइटों से सीधे सत्यापित करके ऑनलाइन आवेदन लिंक, शैक्षणिक योग्यता और अंतिम तिथि से जुड़ी ताजा अपडेट उपलब्ध कराती है।',
    highlights: ['🏛️ Central & State Vacancies', '📅 Verified Cutoff & Last Dates', '🔗 100% Direct Official Apply Links']
  },
  'admit-card': {
    name: 'Admit Card',
    slug: 'admit-card',
    color: '#ab183d',
    icon: '🎫',
    badge: 'Hall Ticket Downloads',
    headline: 'Government Exam Admit Cards & Hall Tickets 2026',
    introEn: 'Welcome to Govt Exam Zone — your instant access point for government exam admit cards and hall tickets nationwide. Stay updated on upcoming preliminary, mains, skill tests, and physical examination schedules conducted by major recruitment commissions. Find direct server download links, exam city intimation slips, and step-by-step instructions to print your official hall ticket without server delays.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। पूरे भारत में विभिन्न सरकारी चयन आयोगों द्वारा आयोजित परीक्षाओं के प्रवेश पत्र (Admit Card) और हॉल टिकट की तत्काल जानकारी यहां उपलब्ध है। SSC, UPSC, रेलवे RRB, पुलिस, बैंकिंग और शिक्षक पात्रता परीक्षाओं के एडमिट कार्ड जारी होते ही डायरेक्ट सर्वर डाउनलोड लिंक, एग्जाम सिटी स्लिप और डाउनलोड करने के आसान निर्देश यहां समय पर प्रदान किए जाते हैं।',
    highlights: ['🎫 Direct Official Server Links', '📍 Exam City & Date Intimation', '🖨️ Step-by-Step Download Guide']
  },
  'result': {
    name: 'Results',
    slug: 'result',
    color: '#ab183d',
    icon: '🏆',
    badge: 'Merit Lists & Scorecards',
    headline: 'Government Exam Results, Cutoff Marks & Merit Lists 2026',
    introEn: 'Welcome to Govt Exam Zone — track your competitive examination results with total speed and authenticity. We bring you prompt announcements for tier-wise written examinations, cutoff marks, selection lists, and final merit rankings across Central and State government boards. Check your scorecards and download official result PDF documents directly through fast, reliable mirror links.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। विभिन्न सरकारी भर्ती आयोगों और विश्वविद्यालयों द्वारा आयोजित प्रतियोगी परीक्षाओं के परिणाम (Results), आधिकारिक कट-ऑफ मार्क्स और मेरिट लिस्ट की प्रामाणिक जानकारी यहां देखें। परीक्षा संपन्न होने के बाद परिणाम घोषित होते ही हम आधिकारिक PDF चयन सूची, अंक पत्र (Scorecard) और संबंधित बोर्ड के डायरेक्ट लिंक तुरंत उपलब्ध कराते हैं।',
    highlights: ['🏆 Official PDF Merit Lists', '📊 Category-wise Cutoff Marks', '⚡ Fast Mirror Result Access']
  },
  'syllabus': {
    name: 'Syllabus',
    slug: 'syllabus',
    color: '#ab183d',
    icon: '📚',
    badge: 'Exam Patterns & Syllabus',
    headline: 'Official Exam Syllabus, Question Patterns & Marks Distribution 2026',
    introEn: 'Welcome to Govt Exam Zone — download official, comprehensive examination syllabi and test patterns for competitive examinations throughout India. A winning preparation strategy starts with complete clarity on subject-wise weightage, marking schemes, and time duration. Download detailed, verified PDF syllabi for SSC, UPSC, Railway (RRB NTPC, ALP, Group D), Police, and State Commission exams.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। सरकारी प्रतियोगी परीक्षाओं के संपूर्ण और नवीनतम पाठ्यक्रम (Syllabus) तथा परीक्षा पैटर्न की सटीक जानकारी यहां प्राप्त करें। किसी भी भर्ती परीक्षा में सफलता के लिए विषयवार अंक विभाजन, नेगेटिव मार्किंग और परीक्षा अवधि का ज्ञान आवश्यक है। यहां आप UPSC, SSC, रेलवे, पुलिस और शिक्षण परीक्षाओं के आधिकारिक सिलेबस PDF सरलता से डाउनलोड कर सकते हैं।',
    highlights: ['📚 Subject-wise Detailed Topics', '⏱️ Exam Pattern & Marking Scheme', '📥 Official Notification PDF Sourcing']
  },
  'answer-key': {
    name: 'Answer Key',
    slug: 'answer-key',
    color: '#ab183d',
    icon: '🔑',
    badge: 'Official Answer Keys',
    headline: 'Official Exam Answer Keys, Response Sheets & Objection Portals 2026',
    introEn: 'Welcome to Govt Exam Zone — verify your answers with official provisional and final answer keys released by government recruiting authorities. Calculate your estimated scores, download candidate response sheets, and access official objection windows before deadlines. We provide direct links to commission dispute portals for SSC, RRB, Police, NTA, and State Board exams.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। भारत भर में आयोजित विभिन्न प्रतियोगी परीक्षाओं की आधिकारिक उत्तर कुंजी (Answer Key) और रिस्पॉन्स शीट यहां देखें। परीक्षा के तुरंत बाद अपने संभावित अंकों की गणना करने, सही उत्तरों का मिलान करने और निर्धारित समय सीमा में ऑनलाइन आपत्ति (Objection) दर्ज कराने के लिए डायरेक्ट आधिकारिक लिंक यहां उपलब्ध कराए जाते हैं।',
    highlights: ['🔑 Provisional & Final Keys', '📝 Question Paper & Response Sheets', '⚖️ Direct Online Objection Links']
  },
  'admission': {
    name: 'Admission',
    slug: 'admission',
    color: '#ab183d',
    icon: '🎓',
    badge: 'National Entrance Forms',
    headline: 'National & State Entrance Examinations & Admission Forms 2026',
    introEn: 'Welcome to Govt Exam Zone — your guide for premier entrance examinations, admission registration forms, counselling schedules, and university allotments across India. Discover verified circulars for NTA NEET, JEE Main, CUET, Polytechnic, ITI, B.Ed, and Central University programmes with complete eligibility and direct apply access.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। देश के प्रतिष्ठित विश्वविद्यालयों, तकनीकी संस्थानों और बोर्डों द्वारा आयोजित राष्ट्रीय और राज्य स्तरीय प्रवेश परीक्षाओं (Admission Forms), काउंसलिंग शेड्यूल और सीट आवंटन की विस्तृत जानकारी यहां प्राप्त करें। NEET, JEE Main, CUET और B.Ed जैसी प्रमुख प्रवेश परीक्षाओं के आवेदन फॉर्म और महत्वपूर्ण निर्देश यहां देखें।',
    highlights: ['🎓 Top University & College Admissions', '📅 Counselling & Seat Allocation', '🔗 Direct Registration Links']
  },
  'certificate-verification': {
    name: 'Certificate Verification',
    slug: 'certificate-verification',
    color: '#ab183d',
    icon: '📑',
    badge: 'Citizen Digital Services',
    headline: 'Official Certificate Verification, e-Governance & Citizen Documents',
    introEn: 'Welcome to Govt Exam Zone — authentic information and direct links for document verification, e-certificates, and public digital identity services. Access authorized portals for Aadhaar updates, PAN Card applications, Caste/Income certificate verification, and DigiLocker credentials essential for government job verification rounds.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। सरकारी नौकरियों के दस्तावेज सत्यापन (Document Verification), डिजिटल पहचान पत्र और प्रमाण पत्र सत्यापन सेवाओं की प्रामाणिक जानकारी यहां प्राप्त करें। आधार, पैन कार्ड, जाति एवं आय प्रमाण पत्र से जुड़े अधिकृत सरकारी पोर्टल्स के लिंक यहां दिए गए हैं जो भर्ती प्रक्रिया के समय आवश्यक होते हैं।',
    highlights: ['📑 Document Verification Guidelines', '🆔 Authorized Citizen Identity Links', '🔒 Official Government Service Gateways']
  },
  'important': {
    name: 'Important',
    slug: 'important',
    color: '#ab183d',
    icon: '🔔',
    badge: 'Candidate Advisories & OTR',
    headline: 'Important Candidate Notices, OTR Registrations & Welfare Schemes',
    introEn: 'Welcome to Govt Exam Zone — track critical candidate advisories, One-Time Registration (OTR) procedures, government scholarship programs, and student welfare initiatives. Stay ahead with timely updates on SSC OTR, State Commission OTRs, National Scholarship Portals, and major administrative recruitment notifications.',
    introHi: 'Govt Exam Zone में आपका स्वागत है। प्रतियोगी परीक्षार्थियों के लिए अति-महत्वपूर्ण सूचनाएं, वन-टाइम रजिस्ट्रेशन (OTR), सरकारी छात्रवृत्ति (Scholarship) योजनाएं और जन-कल्याणकारी पहलों की अद्यतन जानकारी यहां उपलब्ध है। SSC OTR, राज्य आयोग OTR और छात्रवृत्ति फॉर्म से जुड़ी समयबद्ध जानकारी प्राप्त करें।',
    highlights: ['🔔 Urgent Commission Advisories', '📝 Step-by-Step OTR Guidelines', '🎓 Student Scholarship Updates']
  }
};

module.exports = {
  slugify,
  formatDate,
  formatPrettyDate,
  safeJsonParse,
  CATEGORIES
};
