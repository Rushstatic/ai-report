export const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.dataEntry': 'Data Entry (Submit Form)',
    'nav.myReports': 'My Reports',
    'nav.pendingReports': 'Pending Reports',
    'nav.formBuilder': 'Form Builder',
    'nav.employees': 'Employees',
    'nav.hierarchy': 'Hierarchy Units',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Header
    'header.title': 'DHMS PORTAL',
    'header.subtitle': 'District Health Monitoring',
    'header.district': 'Latur District',
    'header.activeStatus': 'Monthly Report Active',

    // Dashboard
    'dash.totalFacilities': 'Total Facilities',
    'dash.totalEmployees': 'Total Employees',
    'dash.expectedReports': 'Expected Reports',
    'dash.submitted': 'Submitted',
    'dash.submissionRate': 'Submission Rate',
    'dash.phcsScs': 'PHCs / SCs',
    'dash.activeStaff': 'Active Staff',
    'dash.currentMonth': 'Current Month',
    'dash.compliance': 'Compliance',
    'dash.chartTitle': 'Taluka-wise Submission Compliance',
    'dash.exportDetail': 'Export Detail',
    'dash.whoNotSubmitted': 'Who Has Not Submitted?',
    'dash.critical': 'Critical',
    'dash.colPhc': 'PHC / Sub-Centre',
    'dash.colEmployee': 'Employee',
    'dash.colDays': 'Days',
    'dash.viewAllPending': 'View All Pending Reports',

    // My Reports
    'reports.title': 'My Reports',
    'reports.colName': 'Report Name',
    'reports.colPeriod': 'Period',
    'reports.colDate': 'Submitted Date',
    'reports.colStatus': 'Status',
    'reports.colActions': 'Actions',
    
    // Form Builder (General)
    'form.save': 'Save',
    'form.submit': 'Submit',
  },
  mr: {
    // Navigation
    'nav.dashboard': 'डॅशबोर्ड',
    'nav.dataEntry': 'डेटा एन्ट्री (अहवाल भरा)',
    'nav.myReports': 'माझे अहवाल',
    'nav.pendingReports': 'प्रलंबित अहवाल',
    'nav.formBuilder': 'फॉर्म बिल्डर',
    'nav.employees': 'कर्मचारी',
    'nav.hierarchy': 'कार्यक्षेत्र',
    'nav.settings': 'सेटिंग्ज',
    'nav.logout': 'बाहेर पडा',

    // Header
    'header.title': 'DHMS पोर्टल',
    'header.subtitle': 'जिल्हा आरोग्य संनियंत्रण',
    'header.district': 'लातूर जिल्हा',
    'header.activeStatus': 'मासिक अहवाल सक्रिय',

    // Dashboard
    'dash.totalFacilities': 'एकूण आरोग्य संस्था',
    'dash.totalEmployees': 'एकूण कर्मचारी',
    'dash.expectedReports': 'अपेक्षित अहवाल',
    'dash.submitted': 'सादर केलेले',
    'dash.submissionRate': 'सादरीकरण प्रमाण',
    'dash.phcsScs': 'प्रा.आ.कें / उपकेंद्रे',
    'dash.activeStaff': 'सक्रिय कर्मचारी',
    'dash.currentMonth': 'चालू महिना',
    'dash.compliance': 'अनुपालन',
    'dash.chartTitle': 'तालुकानिहाय सादरीकरण',
    'dash.exportDetail': 'माहिती डाऊनलोड',
    'dash.whoNotSubmitted': 'अहवाल कोणी सादर केला नाही?',
    'dash.critical': 'गंभीर',
    'dash.colPhc': 'प्रा.आ.कें / उपकेंद्र',
    'dash.colEmployee': 'कर्मचारी',
    'dash.colDays': 'दिवस',
    'dash.viewAllPending': 'सर्व प्रलंबित अहवाल पहा',

    // My Reports
    'reports.title': 'माझे अहवाल',
    'reports.colName': 'अहवालाचे नाव',
    'reports.colPeriod': 'कालावधी',
    'reports.colDate': 'सादर केल्याची तारीख',
    'reports.colStatus': 'स्थिती',
    'reports.colActions': 'कृती',

    // Form Builder (General)
    'form.save': 'जतन करा',
    'form.submit': 'सादर करा',
  }
};

export type TranslationKey = keyof typeof translations.en;

export const useTranslation = (language: 'en' | 'mr') => {
  return (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };
};
