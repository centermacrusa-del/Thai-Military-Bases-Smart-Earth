export type BranchType = 'army' | 'airforce' | 'navy' | 'hq';

export type BaseScale = 'major' | 'camp';

export type RadarTargetFilter = BaseScale | 'fighter' | 'all';

export type RegionType = 'central' | 'northeast' | 'north' | 'east' | 'south';

export type BasemapId = 'satellite-hybrid' | 'satellite' | 'topo' | 'dark';

export interface MilitaryBase {
  id: string;
  nameKm: string;
  nameEn: string;
  nameTh: string;
  branch: BranchType;
  scale: BaseScale;
  region: RegionType;
  provinceKm: string;
  provinceEn: string;
  commandKm: string;
  lat: number;
  lng: number;
  elevationM: number;
  established: string;
  facilityTypeKm: string;
  runwayOrPort?: string;
  summaryKm: string;
  keyUnitsKm: string[];
  isFighterBase?: boolean;
  aircraftTypes?: string[];
  source?: 'catalog' | 'osm';
}

export interface BorderReference {
  id: string;
  nameKm: string;
  nameEn: string;
  lat: number;
  lng: number;
}

export interface RadarPreset {
  id: string;
  labelKm: string;
  lat: number;
  lng: number;
  radiusKm: number;
  zoom: number;
}

export const BRANCH_META: Record<
  BranchType,
  {
    labelKm: string;
    shortKm: string;
    labelEn: string;
    color: string;
    bgSoft: string;
    textClass: string;
  }
> = {
  army: {
    labelKm: 'កងទ័ពជើងគោក',
    shortKm: 'ជើងគោក',
    labelEn: 'Royal Thai Army',
    color: '#10B981',
    bgSoft: 'rgba(16, 185, 129, 0.14)',
    textClass: 'text-emerald-400',
  },
  airforce: {
    labelKm: 'កងទ័ពអាកាស',
    shortKm: 'អាកាស',
    labelEn: 'Royal Thai Air Force',
    color: '#38BDF8',
    bgSoft: 'rgba(56, 189, 248, 0.14)',
    textClass: 'text-sky-400',
  },
  navy: {
    labelKm: 'កងទ័ពជើងទឹក',
    shortKm: 'ជើងទឹក',
    labelEn: 'Royal Thai Navy',
    color: '#60A5FA',
    bgSoft: 'rgba(96, 165, 250, 0.14)',
    textClass: 'text-blue-400',
  },
  hq: {
    labelKm: 'ទីបញ្ជាការដ្ឋានកំពូល',
    shortKm: 'បញ្ជាការដ្ឋាន',
    labelEn: 'Supreme Command HQ',
    color: '#F59E0B',
    bgSoft: 'rgba(245, 158, 11, 0.14)',
    textClass: 'text-amber-400',
  },
};

export const SCALE_META: Record<BaseScale, { labelKm: string; shortKm: string }> = {
  major: { labelKm: 'មូលដ្ឋានយុទ្ធសាស្ត្រធំ', shortKm: 'មូលដ្ឋានធំ' },
  camp: { labelKm: 'បន្ទាយតូច / មណ្ឌលយោធា-ព្រំដែន', shortKm: 'បន្ទាយតូច' },
};

export const REGION_META: Record<RegionType, { labelKm: string; labelEn: string }> = {
  central: { labelKm: 'ភូមិភាគកណ្តាល', labelEn: 'Central' },
  northeast: { labelKm: 'ភូមិភាគឦសាន', labelEn: 'Northeast (Isan)' },
  north: { labelKm: 'ភូមិភាគខាងជើង', labelEn: 'North' },
  east: { labelKm: 'ភូមិភាគខាងកើត', labelEn: 'East' },
  south: { labelKm: 'ភូមិភាគខាងត្បូង', labelEn: 'South' },
};

export const RADAR_PRESETS: RadarPreset[] = [
  { id: 'all-thailand', labelKm: 'ទូទាំងប្រទេសថៃ', lat: 13.45, lng: 101.25, radiusKm: 820, zoom: 5.2 },
  { id: 'border-kh', labelKm: 'តាមព្រំដែនកម្ពុជា-ថៃ', lat: 13.95, lng: 103.15, radiusKm: 280, zoom: 6.8 },
  { id: 'northeast', labelKm: 'ភូមិភាគឦសាន', lat: 15.85, lng: 103.2, radiusKm: 290, zoom: 6.7 },
  { id: 'central-east', labelKm: 'កណ្តាល និងខាងកើត', lat: 13.9, lng: 101.1, radiusKm: 240, zoom: 7.0 },
  { id: 'north', labelKm: 'ភូមិភាគខាងជើង', lat: 18.0, lng: 99.8, radiusKm: 270, zoom: 6.8 },
  { id: 'south', labelKm: 'ភូមិភាគខាងត្បូង', lat: 8.35, lng: 100.1, radiusKm: 310, zoom: 6.6 },
];

export const CAMBODIA_BORDER_REFS: BorderReference[] = [
  { id: 'poipet', nameKm: 'ច្រកប៉ោយប៉ែត', nameEn: 'Poipet / Aranyaprathet', lat: 13.6584, lng: 102.5625 },
  { id: 'osmach', nameKm: 'ច្រកអូរស្មាច់', nameEn: "O'Smach / Chong Chom", lat: 14.4395, lng: 103.6746 },
  { id: 'preah-vihear', nameKm: 'តំបន់ព្រះវិហារ', nameEn: 'Preah Vihear Border', lat: 14.3911, lng: 104.6802 },
  { id: 'emerald-triangle', nameKm: 'តំបន់មុំបី', nameEn: 'Emerald Triangle', lat: 14.3372, lng: 105.2065 },
  { id: 'cham-yeam', nameKm: 'ច្រកចាំយាម (កោះកុង)', nameEn: 'Cham Yeam / Hat Lek', lat: 11.6562, lng: 102.9125 },
];

export const PHNOM_PENH_COORD = { lat: 11.5564, lng: 104.9282 };

export const THAI_MILITARY_BASES: MilitaryBase[] = [
  // ================= MAJOR STRATEGIC BASES & HEADQUARTERS (32) =================
  {
    id: 'rtarf-hq',
    nameKm: 'ទីបញ្ជាការដ្ឋានកងទ័ពភូមិន្ទថៃ (ចែងវឌ្ឍនៈ)',
    nameEn: 'Royal Thai Armed Forces Headquarters',
    nameTh: 'กองบัญชาการกองทัพไทย',
    branch: 'hq',
    scale: 'major',
    region: 'central',
    provinceKm: 'បាងកក',
    provinceEn: 'Bangkok',
    commandKm: 'អគ្គបញ្ជាការដ្ឋានកងទ័ពភូមិន្ទថៃ',
    lat: 13.8902,
    lng: 100.5698,
    elevationM: 5,
    established: '1960',
    facilityTypeKm: 'ទីបញ្ជាការដ្ឋានយុទ្ធសាស្ត្រកណ្តាល',
    summaryKm: 'ទីស្នាក់ការកណ្តាលសម្របសម្រួលប្រតិបត្តិការរួមរវាងកងទ័ពជើងគោក ជើងទឹក និងជើងអាកាស ស្ថិតនៅតាមបណ្តោយផ្លូវចែងវឌ្ឍនៈ ភាគខាងជើងក្រុងបាងកក។',
    keyUnitsKm: ['ការិយាល័យអគ្គមេបញ្ជាការ', 'នាយកដ្ឋានប្រតិបត្តិការរួម', 'មជ្ឈមណ្ឌលបញ្ជាការរួម'],
  },
  {
    id: 'rta-hq',
    nameKm: 'ទីបញ្ជាការដ្ឋានកងទ័ពជើងគោកថៃ',
    nameEn: 'Royal Thai Army Headquarters',
    nameTh: 'กองบัญชาการกองทัพบก',
    branch: 'army',
    scale: 'major',
    region: 'central',
    provinceKm: 'បាងកក',
    provinceEn: 'Bangkok',
    commandKm: 'កងទ័ពជើងគោកភូមិន្ទថៃ',
    lat: 13.7634,
    lng: 100.5082,
    elevationM: 4,
    established: '1874',
    facilityTypeKm: 'ទីបញ្ជាការដ្ឋានកងទ័ពជើងគោក',
    summaryKm: 'ទីបញ្ជាការកំពូលរបស់កងទ័ពជើងគោកថៃ ស្ថិតនៅតាមមហាវិថីរាជដំណើរក្រៅ កណ្តាលរាជធានីបាងកក ជិតព្រះបរមរាជវាំង និងទន្លេចៅប្រាយ៉ា។',
    keyUnitsKm: ['អគ្គសេនាធិការកងទ័ពជើងគោក', 'សារមន្ទីរកងទ័ពជើងគោក'],
  },
  {
    id: 'rta-1st-army',
    nameKm: 'បញ្ជាការដ្ឋានយោធភូមិភាគទី១',
    nameEn: '1st Army Area Headquarters',
    nameTh: 'กองทัพภาคที่ 1',
    branch: 'army',
    scale: 'major',
    region: 'central',
    provinceKm: 'បាងកក',
    provinceEn: 'Bangkok',
    commandKm: 'យោធភូមិភាគទី១',
    lat: 13.7705,
    lng: 100.5142,
    elevationM: 4,
    established: '1910',
    facilityTypeKm: 'បញ្ជាការដ្ឋានភូមិភាគ',
    summaryKm: 'ទទួលខុសត្រូវការពារតំបន់កណ្តាល តំបន់ខាងកើត និងព្រំដែនខាងលិចភាគកណ្តាល រួមទាំងរាជធានីបាងកក និងខេត្តជាប់ព្រំដែនសាកែវ។',
    keyUnitsKm: ['កងពលតូចអង្គរក្សទី១', 'កងពលតូចថ្មើរជើងទី២', 'កងពលតូចថ្មើរជើងទី៩'],
  },
  {
    id: 'rta-2nd-army-suranaree',
    nameKm: 'យោធភូមិភាគទី២ (បន្ទាយសុរនារី)',
    nameEn: '2nd Army Area HQ — Fort Suranaree',
    nameTh: 'กองทัพภาคที่ 2 (ค่ายสุรนารี)',
    branch: 'army',
    scale: 'major',
    region: 'northeast',
    provinceKm: 'នគររាជសីមា (កូរ៉ាត់)',
    provinceEn: 'Nakhon Ratchasima',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 14.9625,
    lng: 102.0942,
    elevationM: 192,
    established: '1948',
    facilityTypeKm: 'បញ្ជាការដ្ឋានយោធភូមិភាគឦសាន',
    summaryKm: 'បញ្ជាការដ្ឋានស្នូលគ្រប់គ្រងភូមិភាគឦសានទាំង២០ខេត្តរបស់ប្រទេសថៃ ដែលមានភូមិសាស្ត្រលាតសន្ធឹងជាប់ព្រំដែនភាគខាងជើងប្រទេសកម្ពុជា និងឡាវ។',
    keyUnitsKm: ['កងពលតូចថ្មើរជើងទី៣', 'កងពលតូចថ្មើរជើងទី៦', 'កងកម្លាំងសុរនារី'],
  },
  {
    id: 'rta-3rd-army-naresuan',
    nameKm: 'យោធភូមិភាគទី៣ (បន្ទាយសម្តេចព្រះនរេសួន)',
    nameEn: '3rd Army Area HQ — Fort Somdet Phra Naresuan',
    nameTh: 'กองทัพภาคที่ 3 (ค่ายสมเด็จพระนเรศวรมหาราช)',
    branch: 'army',
    scale: 'major',
    region: 'north',
    provinceKm: 'ពិស្ណុលោក',
    provinceEn: 'Phitsanulok',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 16.8378,
    lng: 100.2581,
    elevationM: 48,
    established: '1902',
    facilityTypeKm: 'បញ្ជាការដ្ឋានយោធភូមិភាគខាងជើង',
    summaryKm: 'បញ្ជាការដ្ឋានកងទ័ពជើងគោកគ្រប់គ្រងតំបន់ភាគខាងជើងទាំងមូល ស្ថិតនៅតាមដងទន្លេណាន ក្នុងខេត្តពិស្ណុលោក ជាចំណុចភ្ជាប់វាលទំនាបកណ្តាល និងភ្នំភាគខាងជើង។',
    keyUnitsKm: ['កងពលតូចថ្មើរជើងទី៤', 'កងពលតូចទ័ពសេះទី១', 'កងពលតូចថ្មើរជើងទី៧'],
  },
  {
    id: 'rta-4th-army-wachirawut',
    nameKm: 'យោធភូមិភាគទី៤ (បន្ទាយវជិរាវុធ)',
    nameEn: '4th Army Area HQ — Fort Wachirawut',
    nameTh: 'กองทัพภาคที่ 4 (ค่ายวชิราวุธ)',
    branch: 'army',
    scale: 'major',
    region: 'south',
    provinceKm: 'នគរស្រីធម្មរាជ',
    provinceEn: 'Nakhon Si Thammarat',
    commandKm: 'យោធភូមិភាគទី៤',
    lat: 8.4721,
    lng: 99.9612,
    elevationM: 12,
    established: '1975',
    facilityTypeKm: 'បញ្ជាការដ្ឋានយោធភូមិភាគខាងត្បូង',
    summaryKm: 'បញ្ជាការដ្ឋានស្នូលគ្រប់គ្រងឧបទ្វីបភាគខាងត្បូងទាំង១៤ខេត្តរបស់ថៃ ចាប់ពីខេត្តឈុមផនរហូតដល់ព្រំដែនម៉ាឡេស៊ី។',
    keyUnitsKm: ['កងពលតូចថ្មើរជើងទី៥', 'កងពលតូចថ្មើរជើងទី១៥'],
  },
  {
    id: 'rta-special-warfare',
    nameKm: 'បញ្ជាការដ្ឋានទ័ពពិសេស (បន្ទាយព្រះនារាយណ៍)',
    nameEn: 'Special Warfare Command — Fort Somdet Phra Narai',
    nameTh: 'หน่วยบัญชาการสงครามพิเศษ (ค่ายสมเด็จพระนารายณ์มหาราช)',
    branch: 'army',
    scale: 'major',
    region: 'central',
    provinceKm: 'លពបុរី',
    provinceEn: 'Lopburi',
    commandKm: 'បញ្ជាការដ្ឋានទ័ពពិសេស',
    lat: 14.8012,
    lng: 100.6531,
    elevationM: 28,
    established: '1966',
    facilityTypeKm: 'មជ្ឈមណ្ឌលទ័ពពិសេស និងឆ័ត្រយោង',
    summaryKm: 'មជ្ឈមណ្ឌលកណ្តាលនៃកងកម្លាំងពិសេសថៃ និងសាលាហ្វឹកហ្វឺនទ័ពឆ័ត្រយោង ស្ថិតនៅខេត្តលពបុរី ដែលជាតំបន់ប្រមូលផ្តុំមូលដ្ឋានយោធាធំជាងគេមួយ។',
    keyUnitsKm: ['កងពលតូចទ័ពពិសេសទី១', 'សាលាទ័ពពិសេស'],
  },
  {
    id: 'rta-aviation-center',
    nameKm: 'មជ្ឈមណ្ឌលអាកាសចរណ៍កងទ័ពជើងគោក (បន្ទាយស្រីនគរិន្ទ)',
    nameEn: 'Army Aviation Center — Fort Somdet Phra Si Nakharin',
    nameTh: 'ศูนย์การบินทหารบก',
    branch: 'army',
    scale: 'major',
    region: 'central',
    provinceKm: 'លពបុរី',
    provinceEn: 'Lopburi',
    commandKm: 'មជ្ឈមណ្ឌលអាកាសចរណ៍ជើងគោក',
    lat: 14.8685,
    lng: 100.6634,
    elevationM: 34,
    established: '1977',
    facilityTypeKm: 'មូលដ្ឋានឧទ្ធម្ភាគចក្រកងទ័ពជើងគោក',
    runwayOrPort: 'ផ្លូវរត់អាកាសយានដ្ឋានខោកកៈធៀម ~2,000 m',
    summaryKm: 'មូលដ្ឋានស្នូលសម្រាប់កងឧទ្ធម្ភាគចក្រដឹកជញ្ជូន និងសង្គ្រោះបន្ទាន់របស់កងទ័ពជើងគោកថៃ ស្ថិតនៅជាប់មូលដ្ឋានទ័ពអាកាសកងពលទី២ លពបុរី។',
    keyUnitsKm: ['កងវរសេនាតូចអាកាសចរណ៍', 'សាលាហ្វឹកហ្វឺនអាកាសចរណ៍ជើងគោក'],
  },
  {
    id: 'rta-phrom-yothi',
    nameKm: 'បន្ទាយព្រហ្មយោធី (កងពលតូចថ្មើរជើងទី២)',
    nameEn: "Fort Phrom Yothi — 2nd Infantry Division Queen's Guard",
    nameTh: 'ค่ายพรหมโยธี (กองพลทหารราบที่ 2 รักษาพระองค์)',
    branch: 'army',
    scale: 'major',
    region: 'east',
    provinceKm: 'ប្រាចិនបុរី',
    provinceEn: 'Prachinburi',
    commandKm: 'យោធភូមិភាគទី១',
    lat: 14.0867,
    lng: 101.3672,
    elevationM: 22,
    established: '1950',
    facilityTypeKm: 'មូលដ្ឋានកងពលតូចរថពាសដែក-ថ្មើរជើង',
    summaryKm: 'មូលដ្ឋានកងពលតូចថ្មើរជើងមេកានិចដ៏សំខាន់នៅភូមិភាគខាងកើត ស្ថិតនៅខេត្តប្រាចិនបុរី ចម្ងាយប្រហែល ១៣០ គ.ម ពីច្រកព្រំដែនប៉ោយប៉ែត។',
    keyUnitsKm: ['កងពលតូចថ្មើរជើងទី២ រក្សាព្រះអង្គ', 'កងវរសេនាតូចរថពាសដែក'],
  },
  {
    id: 'rta-chakrapongse',
    nameKm: 'បន្ទាយចក្រពង្ស',
    nameEn: 'Fort Chakrapongse',
    nameTh: 'ค่ายจักรพงษ์',
    branch: 'army',
    scale: 'major',
    region: 'east',
    provinceKm: 'ប្រាចិនបុរី',
    provinceEn: 'Prachinburi',
    commandKm: 'មណ្ឌលយោធាទី១២ (យោធភូមិភាគទី១)',
    lat: 14.0545,
    lng: 101.3852,
    elevationM: 15,
    established: '1908',
    facilityTypeKm: 'បន្ទាយប្រវត្តិសាស្ត្រ និងភស្តុភារខាងកើត',
    summaryKm: 'បន្ទាយយោធាប្រវត្តិសាស្ត្រនៅខេត្តប្រាចិនបុរី គ្រប់គ្រងមណ្ឌលយោធាទី១២ និងជាចំណុចភស្តុភារសំខាន់នៃច្រករបៀងខាងកើត។',
    keyUnitsKm: ['មណ្ឌលយោធាទី១២', 'កងវរសេនាធំថ្មើរជើងទី២'],
  },
  {
    id: 'rta-taksin-chanthaburi',
    nameKm: 'បន្ទាយព្រះចៅតាកស៊ីន (ការពារព្រំដែនចន្ទបុរី-ត្រាត)',
    nameEn: 'Fort Taksin — Chanthaburi & Trat Border Defense HQ',
    nameTh: 'ค่ายตากสิน (กองบัญชาการป้องกันชายแดนจันทบุรีและตราด)',
    branch: 'navy',
    scale: 'major',
    region: 'east',
    provinceKm: 'ចន្ទបុរី',
    provinceEn: 'Chanthaburi',
    commandKm: 'កងទ័ពជើងទឹក / ទាហានម៉ារីនថៃ',
    lat: 12.6075,
    lng: 102.1128,
    elevationM: 18,
    established: '1978',
    facilityTypeKm: 'បញ្ជាការដ្ឋានការពារព្រំដែនខាងកើត',
    summaryKm: 'ទីបញ្ជាការការពារព្រំដែនខេត្តចន្ទបុរី និងត្រាត ដឹកនាំដោយកងទាហានម៉ារីននៃកងទ័ពជើងទឹកថៃ នៅជាប់តំបន់ព្រំដែនភាគនិរតីកម្ពុជា។',
    keyUnitsKm: ['បញ្ជាការដ្ឋានការពារព្រំដែនចន្ទបុរី-ត្រាត', 'កងវរសេនាធំទាហានម៉ារីន'],
  },
  {
    id: 'rta-weerawat-surin',
    nameKm: 'បន្ទាយវីរវ័ត្ដយោធិន (មណ្ឌលយោធាទី២៥)',
    nameEn: 'Fort Weerawat Yothin — 25th Military Circle',
    nameTh: 'ค่ายวีรวัฒน์โยธิน (มณฑลทหารบกที่ 25)',
    branch: 'army',
    scale: 'major',
    region: 'northeast',
    provinceKm: 'សុរិន្ទ្រ',
    provinceEn: 'Surin',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 14.8819,
    lng: 103.5048,
    elevationM: 145,
    established: '1954',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តសុរិន្ទ្រ',
    summaryKm: 'មូលដ្ឋានយោធាសំខាន់នៅភូមិភាគឦសានភាគខាងត្បូង ស្ថិតក្នុងក្រុងសុរិន្ទ្រ ចម្ងាយប្រហែល ៥២ គ.ម ភាគខាងជើងច្រកព្រំដែនអូរស្មាច់-ចុងចម។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៥', 'កងវរសេនាតូចថ្មើរជើងទី៣ កងវរសេនាធំទី២៣'],
  },
  {
    id: 'rta-sapphasit-ubon',
    nameKm: 'បន្ទាយសព្វសិទ្ធិប្រសង្គ (មណ្ឌលយោធាទី២២)',
    nameEn: 'Fort Sapphasitthiprasong — 22nd Military Circle',
    nameTh: 'ค่ายสรรพสิทธิประสงค์ (มณฑลทหารบกที่ 22)',
    branch: 'army',
    scale: 'major',
    region: 'northeast',
    provinceKm: 'ឧប៊ុនរាជធានី',
    provinceEn: 'Ubon Ratchathani',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 15.1972,
    lng: 104.8614,
    elevationM: 122,
    established: '1914',
    facilityTypeKm: 'មូលដ្ឋានភូមិភាគឦសានចុងខាងកើត',
    summaryKm: 'បន្ទាយយោធាធំនៅស្រុកវ៉ារិនឆាំរ៉ាប់ ខេត្តឧប៊ុនរាជធានី ជិតទន្លេមូន និងតំបន់មុំបី (ព្រំដែនថៃ-កម្ពុជា-ឡាវ)។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២២', 'កងវរសេនាធំថ្មើរជើងទី៦'],
  },
  {
    id: 'rta-adisorn-saraburi',
    nameKm: 'បន្ទាយអឌិសន (មជ្ឈមណ្ឌលទ័ពសេះ)',
    nameEn: 'Fort Adisorn — Royal Thai Army Cavalry Center',
    nameTh: 'ค่ายอดิศร (ศูนย์การทหารม้า)',
    branch: 'army',
    scale: 'major',
    region: 'central',
    provinceKm: 'សារ៉ាបុរី',
    provinceEn: 'Saraburi',
    commandKm: 'មជ្ឈមណ្ឌលទ័ពសេះ',
    lat: 14.5356,
    lng: 100.9167,
    elevationM: 25,
    established: '1954',
    facilityTypeKm: 'មជ្ឈមណ្ឌលហ្វឹកហ្វឺនទ័ពសេះ និងរថក្រោះ',
    summaryKm: 'មជ្ឈមណ្ឌលកណ្តាលសម្រាប់ហ្វឹកហ្វឺនកងទ័ពរថក្រោះ និងទ័ពសេះថៃ ស្ថិតនៅច្រកផ្លូវមិត្តភាពឆ្ពោះទៅភូមិភាគឦសាន។',
    keyUnitsKm: ['សាលាទ័ពសេះ', 'កងពលតូចទ័ពសេះ'],
  },
  {
    id: 'rta-phahonyothin-artillery',
    nameKm: 'បន្ទាយពហលយោធិន (មជ្ឈមណ្ឌលកាំភ្លើងធំ)',
    nameEn: 'Fort Phahonyothin — Artillery Center',
    nameTh: 'ค่ายพหลโยธิน (ศูนย์การทหารปืนใหญ่)',
    branch: 'army',
    scale: 'major',
    region: 'central',
    provinceKm: 'លពបុរី',
    provinceEn: 'Lopburi',
    commandKm: 'មជ្ឈមណ្ឌលកាំភ្លើងធំ',
    lat: 14.8351,
    lng: 100.6845,
    elevationM: 32,
    established: '1952',
    facilityTypeKm: 'មជ្ឈមណ្ឌលកាំភ្លើងធំកងទ័ពជើងគោក',
    summaryKm: 'មជ្ឈមណ្ឌលបណ្តុះបណ្តាល និងទីបញ្ជាការកងកាំភ្លើងធំថៃ ស្ថិតនៅខេត្តលពបុរី រួមជាមួយទីលានហ្វឹកហ្វឺនភ្នំផ្លុង។',
    keyUnitsKm: ['កងពលតូចកាំភ្លើងធំ', 'សាលាកាំភ្លើងធំ'],
  },
  {
    id: 'rta-surasak-lampang',
    nameKm: 'បន្ទាយសុរស័ក្តិមន្ត្រី (មណ្ឌលយោធាទី៣២)',
    nameEn: 'Fort Surasak Montri — 32nd Military Circle',
    nameTh: 'ค่ายสุรศักดิ์มนตรี (มณฑลทหารบกที่ 32)',
    branch: 'army',
    scale: 'major',
    region: 'north',
    provinceKm: 'ឡាំប៉ាង',
    provinceEn: 'Lampang',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 18.3081,
    lng: 99.5147,
    elevationM: 245,
    established: '1902',
    facilityTypeKm: 'មូលដ្ឋានយោធាភូមិភាគខាងជើង',
    summaryKm: 'បន្ទាយយោធាដ៏ចំណាស់មួយនៅខេត្តឡាំប៉ាង ភាគខាងជើងប្រទេសថៃ តាមបណ្តោយទន្លេវ៉ាំង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣២', 'កងវរសេនាធំថ្មើរជើងទី១៧'],
  },
  {
    id: 'rta-kawila-chiangmai',
    nameKm: 'បន្ទាយកាវិលៈ (មណ្ឌលយោធាទី៣៣)',
    nameEn: 'Fort Kawila — 33rd Military Circle',
    nameTh: 'ค่ายกาวิละ (มณฑลทหารบกที่ 33)',
    branch: 'army',
    scale: 'major',
    region: 'north',
    provinceKm: 'ឈៀងម៉ៃ',
    provinceEn: 'Chiang Mai',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 18.7844,
    lng: 99.0135,
    elevationM: 312,
    established: '1937',
    facilityTypeKm: 'មណ្ឌលយោធាឈៀងម៉ៃ',
    summaryKm: 'មូលដ្ឋានកងទ័ពជើងគោកស្ថិតនៅភាគខាងកើតទន្លេពីង ក្នុងទីក្រុងឈៀងម៉ៃ គ្រប់គ្រងសន្តិសុខតំបន់ភ្នំភាគពាយ័ព្យ។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣៣', 'កងវរសេនាធំថ្មើរជើងទី៧'],
  },
  {
    id: 'rta-senanarong-songkhla',
    nameKm: 'បន្ទាយសេនាណារ៉ុង (មណ្ឌលយោធាទី៤២)',
    nameEn: 'Fort Senanarong — 42nd Military Circle',
    nameTh: 'ค่ายเสนาณรงค์ (มณฑลทหารบกที่ 42)',
    branch: 'army',
    scale: 'major',
    region: 'south',
    provinceKm: 'សុងខ្លា (ហាតយ៉ៃ)',
    provinceEn: 'Songkhla',
    commandKm: 'យោធភូមិភាគទី៤',
    lat: 7.0185,
    lng: 100.4935,
    elevationM: 16,
    established: '1939',
    facilityTypeKm: 'មូលដ្ឋានយោធាភាគខាងត្បូង',
    summaryKm: 'មូលដ្ឋានកងទ័ពជើងគោកសំខាន់នៅស្រុកហាតយ៉ៃ ខេត្តសុងខ្លា ជាចំណុចភស្តុភារសម្រាប់ខេត្តព្រំដែនភាគខាងត្បូង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៤២', 'កងវរសេនាធំថ្មើរជើងទី៥'],
  },
  {
    id: 'rtaf-don-mueang',
    nameKm: 'ទីបញ្ជាការដ្ឋានកងទ័ពអាកាស ដនមឿង (កងពលទី៦)',
    nameEn: 'Don Mueang RTAF Base & HQ (Wing 6)',
    nameTh: 'ฐานทัพอากาศดอนเมือง (กองบิน 6)',
    branch: 'airforce',
    scale: 'major',
    region: 'central',
    provinceKm: 'បាងកក',
    provinceEn: 'Bangkok',
    commandKm: 'ទីបញ្ជាការកងទ័ពអាកាសភូមិន្ទថៃ',
    lat: 13.9126,
    lng: 100.6068,
    elevationM: 5,
    established: '1914',
    facilityTypeKm: 'ទីបញ្ជាការកងទ័ពអាកាស និងដឹកជញ្ជូនផ្លូវអាកាស',
    runwayOrPort: 'ផ្លូវរត់ភ្លោះ 3,700 m & 3,500 m (VTBD)',
    summaryKm: 'ទីបញ្ជាការកំពូលរបស់កងទ័ពអាកាសភូមិន្ទថៃ និងមូលដ្ឋានកងពលដឹកជញ្ជូនផ្លូវអាកាសទី៦ ស្ថិតនៅជាប់អាកាសយានដ្ឋានដនមឿង។',
    keyUnitsKm: ['ទីបញ្ជាការដ្ឋានកងទ័ពអាកាស', 'កងពលអាកាសទី៦ (យន្តហោះដឹកជញ្ជូន C-130)'],
  },
  {
    id: 'rtaf-korat-wing1',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសកូរ៉ាត់ (កងពលទី១ — F-16)',
    nameEn: 'Korat RTAF Base — Wing 1 (F-16 Main Base)',
    nameTh: 'กองบิน 1 นครราชสีมา',
    branch: 'airforce',
    scale: 'major',
    region: 'northeast',
    provinceKm: 'នគររាជសីមា (កូរ៉ាត់)',
    provinceEn: 'Nakhon Ratchasima',
    commandKm: 'កងពលអាកាសទី១',
    lat: 14.9345,
    lng: 102.0786,
    elevationM: 222,
    established: '1976',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះចម្បាំងស្នូល F-16',
    runwayOrPort: 'ផ្លូវរត់ 3,000 m (VTUN)',
    summaryKm: 'មូលដ្ឋានយន្តហោះចម្បាំង F-16 ធំបំផុតរបស់ថៃ ស្ថិតនៅភូមិភាគឦសាន ជាទីតាំងនៃកងអនុសេនាធំយន្តហោះចម្បាំង F-16A/B ទី១០២ និងទី១០៣ និងការហ្វឹកហាត់អន្តរជាតិ Cope Tiger។',
    keyUnitsKm: ['កងអនុសេនាធំទី១០២ (F-16A/B ADF)', 'កងអនុសេនាធំទី១០៣ (F-16A/B OCU)'],
    isFighterBase: true,
    aircraftTypes: ['F-16A/B ADF', 'F-16A/B OCU'],
  },
  {
    id: 'rtaf-lopburi-wing2',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសខោកកៈធៀម (កងពលទី២)',
    nameEn: 'Khok Kathiam RTAF Base — Wing 2',
    nameTh: 'กองบิน 2 ลพบุรี',
    branch: 'airforce',
    scale: 'major',
    region: 'central',
    provinceKm: 'លពបុរី',
    provinceEn: 'Lopburi',
    commandKm: 'កងពលអាកាសទី២',
    lat: 14.8744,
    lng: 100.6631,
    elevationM: 32,
    established: '1937',
    facilityTypeKm: 'មូលដ្ឋានឧទ្ធម្ភាគចក្រកងទ័ពអាកាស',
    runwayOrPort: 'ផ្លូវរត់ 2,500 m (VTBL)',
    summaryKm: 'មូលដ្ឋានកងពលអាកាសទី២ ប្រតិបត្តិការឧទ្ធម្ភាគចក្រស្វែងរក-សង្គ្រោះ និងដឹកជញ្ជូនសំខាន់ៗនៅភាគកណ្តាល។',
    keyUnitsKm: ['កងអនុសេនាធំទី២០១', 'កងអនុសេនាធំទី២០៣'],
  },
  {
    id: 'rtaf-takhli-wing4',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសតាឃ្លី (កងពលទី៤ — F-16 MLU & T-50)',
    nameEn: 'Takhli RTAF Base — Wing 4 (F-16 MLU / T-50TH)',
    nameTh: 'กองบิน 4 ตาคลี',
    branch: 'airforce',
    scale: 'major',
    region: 'central',
    provinceKm: 'នគរសួគ៌',
    provinceEn: 'Nakhon Sawan',
    commandKm: 'កងពលអាកាសទី៤',
    lat: 15.2772,
    lng: 100.2958,
    elevationM: 33,
    established: '1943',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះចម្បាំង F-16 MLU និង T-50TH',
    runwayOrPort: 'ផ្លូវរត់ 3,000 m (VTPI)',
    summaryKm: 'មូលដ្ឋានយន្តហោះចម្បាំងស្នូលទី២ របស់ F-16 នៅខេត្តនគរសួគ៌ ប្រតិបត្តិការយន្តហោះចម្បាំងទំនើប F-16A/B eMLU (កងអនុសេនាធំទី៤០៣) និងយន្តហោះចម្បាំងហ្វឹកហ្វឺន T-50TH Golden Eagle។',
    keyUnitsKm: ['កងអនុសេនាធំទី៤០៣ (F-16A/B eMLU)', 'កងអនុសេនាធំទី៤០១ (T-50TH Golden Eagle)'],
    isFighterBase: true,
    aircraftTypes: ['F-16A/B eMLU', 'T-50TH'],
  },
  {
    id: 'rtaf-ubon-wing21',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសឧប៊ុន (កងពលទី២១ — F-5TH)',
    nameEn: 'Ubon Ratchathani RTAF Base — Wing 21 (F-5TH)',
    nameTh: 'กองบิน 21 อุบลราชธานี',
    branch: 'airforce',
    scale: 'major',
    region: 'northeast',
    provinceKm: 'ឧប៊ុនរាជធានី',
    provinceEn: 'Ubon Ratchathani',
    commandKm: 'កងពលអាកាសទី២១',
    lat: 15.2513,
    lng: 104.8702,
    elevationM: 124,
    established: '1977',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះចម្បាំង F-5TH ភូមិភាគឦសាន',
    runwayOrPort: 'ផ្លូវរត់ 3,000 m (VTUU)',
    summaryKm: 'មូលដ្ឋានយន្តហោះចម្បាំងនៅភាគឦសានចុងខាងកើត ជិតតំបន់មុំបី (ព្រំដែនកម្ពុជា-ឡាវ-ថៃ) ប្រតិបត្តិការយន្តហោះចម្បាំងទំនើបកម្ម F-5TH Super Tigris។',
    keyUnitsKm: ['កងអនុសេនាធំទី២១១ (F-5TH Super Tigris)'],
    isFighterBase: true,
    aircraftTypes: ['F-5TH Super Tigris'],
  },
  {
    id: 'rtaf-udon-wing23',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសអ៊ូដនថានី (កងពលទី២៣ — Alpha Jet)',
    nameEn: 'Udon Thani RTAF Base — Wing 23 (Alpha Jet)',
    nameTh: 'กองบิน 23 อุดรธานี',
    branch: 'airforce',
    scale: 'major',
    region: 'northeast',
    provinceKm: 'អ៊ូដនថានី',
    provinceEn: 'Udon Thani',
    commandKm: 'កងពលអាកាសទី២៣',
    lat: 17.3864,
    lng: 102.7883,
    elevationM: 176,
    established: '1977',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះវាយប្រហារធុនស្រាល Alpha Jet',
    runwayOrPort: 'ផ្លូវរត់ 3,048 m (VTUD)',
    summaryKm: 'មូលដ្ឋានយន្តហោះវាយប្រហារនៅភូមិភាគឦសានភាគខាងជើង ជិតទន្លេមេគង្គ ប្រតិបត្តិការយន្តហោះវាយប្រហារ Alpha Jet TH។',
    keyUnitsKm: ['កងអនុសេនាធំទី២៣១ (Alpha Jet TH)'],
    isFighterBase: true,
    aircraftTypes: ['Alpha Jet TH'],
  },
  {
    id: 'rtaf-chiangmai-wing41',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសឈៀងម៉ៃ (កងពលទី៤១ — AT-6TH)',
    nameEn: 'Chiang Mai RTAF Base — Wing 41 (AT-6TH)',
    nameTh: 'กองบิน 41 เชียงใหม่',
    branch: 'airforce',
    scale: 'major',
    region: 'north',
    provinceKm: 'ឈៀងម៉ៃ',
    provinceEn: 'Chiang Mai',
    commandKm: 'កងពលអាកាសទី៤១',
    lat: 18.7668,
    lng: 98.9626,
    elevationM: 316,
    established: '1941',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះវាយប្រហារស្រាលភាគខាងជើង',
    runwayOrPort: 'ផ្លូវរត់ 3,100 m (VTCC)',
    summaryKm: 'មូលដ្ឋានទ័ពអាកាសការពារដែនអាកាសភាគខាងជើង ស្ថិតនៅជាប់អាកាសយានដ្ឋានអន្តរជាតិឈៀងម៉ៃ ប្រតិបត្តិការយន្តហោះវាយប្រហារធុនស្រាល AT-6TH Wolverine។',
    keyUnitsKm: ['កងអនុសេនាធំទី៤១១ (AT-6TH Wolverine)'],
    isFighterBase: true,
    aircraftTypes: ['AT-6TH Wolverine'],
  },
  {
    id: 'rtaf-suratthani-wing7',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសសុរ៉ាត់ថានី (កងពលទី៧ — Gripen)',
    nameEn: 'Surat Thani RTAF Base — Wing 7 (JAS 39 Gripen)',
    nameTh: 'กองบิน 7 สุราษฎร์ธานี',
    branch: 'airforce',
    scale: 'major',
    region: 'south',
    provinceKm: 'សុរ៉ាត់ថានី',
    provinceEn: 'Surat Thani',
    commandKm: 'កងពលអាកាសទី៧',
    lat: 9.1326,
    lng: 99.1356,
    elevationM: 6,
    established: '1982',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះចម្បាំង JAS 39 Gripen',
    runwayOrPort: 'ផ្លូវរត់ 3,000 m (VTSB)',
    summaryKm: 'មូលដ្ឋានទ័ពអាកាសទំនើបបំផុតនៅភាគខាងត្បូង ជាទីតាំងនៃយន្តហោះចម្បាំង JAS 39C/D Gripen (និងគម្រោង Gripen E/F) ព្រមទាំងយន្តហោះរ៉ាដា Saab 340 AEW។',
    keyUnitsKm: ['កងអនុសេនាធំទី៧០១ (JAS 39C/D Gripen)', 'កងអនុសេនាធំទី៧០២ (Saab 340 AEW)'],
    isFighterBase: true,
    aircraftTypes: ['JAS 39 Gripen', 'Saab 340 AEW'],
  },
  {
    id: 'rtaf-hatyai-wing56',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសហាតយ៉ៃ (កងពលទី៥៦ — មូលដ្ឋានបម្រុងយន្តហោះចម្បាំង)',
    nameEn: 'Hat Yai RTAF Base — Wing 56 (Forward Fighter Base)',
    nameTh: 'กองบิน 56 หาดใหญ่',
    branch: 'airforce',
    scale: 'major',
    region: 'south',
    provinceKm: 'សុងខ្លា (ហាតយ៉ៃ)',
    provinceEn: 'Songkhla',
    commandKm: 'កងពលអាកាសទី៥៦',
    lat: 6.9332,
    lng: 100.3929,
    elevationM: 28,
    established: '1990',
    facilityTypeKm: 'មូលដ្ឋានបម្រុងយន្តហោះចម្បាំងភាគខាងត្បូង',
    runwayOrPort: 'ផ្លូវរត់ 3,050 m (VTSS)',
    summaryKm: 'មូលដ្ឋានទ័ពអាកាសជួរមុខភាគខាងត្បូង មានលេណដ្ឋានការពារយន្តហោះសម្រាប់ដាក់ពង្រាយយន្តហោះចម្បាំង JAS 39 Gripen និង F-16 ក្នុងប្រតិបត្តិការការពារដែនអាកាសភាគខាងត្បូង។',
    keyUnitsKm: ['កងពលអាកាសទី៥៦', 'ទីតាំងដាក់ពង្រាយបម្រុង Gripen / F-16'],
    isFighterBase: true,
    aircraftTypes: ['Gripen / F-16 (បម្រុង)'],
  },
  {
    id: 'rtaf-nam-phong',
    nameKm: 'អាកាសយានដ្ឋានយោធាណាំផង (មូលដ្ឋានបម្រុង F-16 ឦសាន)',
    nameEn: 'Nam Phong RTAF Dispersal Airfield (Khon Kaen)',
    nameTh: 'ฝูงบิน 237 น้ำพอง (ขอนแก่น)',
    branch: 'airforce',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'ខនកែន',
    provinceEn: 'Khon Kaen',
    commandKm: 'កងពលអាកាសទី២៣ (អង្គភាពណាំផង ២៣៧)',
    lat: 16.6522,
    lng: 102.9661,
    elevationM: 185,
    established: '1972',
    facilityTypeKm: 'អាកាសយានដ្ឋានបម្រុងយន្តហោះចម្បាំង F-16',
    runwayOrPort: 'ផ្លូវរត់ 3,000 m (អាកាសយានដ្ឋានយោធាណាំផង)',
    summaryKm: 'អាកាសយានដ្ឋានយោធាប្រវត្តិសាស្ត្រនៅខេត្តខនកែន មានផ្លូវរត់វែង ៣,០០០ ម៉ែត្រ ប្រើប្រាស់ជាមូលដ្ឋានដាក់ពង្រាយបម្រុង និងហ្វឹកហាត់សម្រាប់យន្តហោះចម្បាំង F-16 និង Alpha Jet នៅភូមិភាគឦសាន។',
    keyUnitsKm: ['អង្គភាពអាកាសយានដ្ឋានណាំផង (២៣៧)', 'ទីតាំងបម្រុង F-16 / Alpha Jet'],
    isFighterBase: true,
    aircraftTypes: ['F-16 / Alpha Jet (បម្រុង)'],
  },
  {
    id: 'rtaf-prachuap-wing5',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសប្រាជួបគិរីខ័ន្ធ (កងពលទី៥)',
    nameEn: 'Prachuap Khiri Khan RTAF Base — Wing 5 (Ao Manao)',
    nameTh: 'กองบิน 5 ประจวบคีรีขันธ์',
    branch: 'airforce',
    scale: 'major',
    region: 'central',
    provinceKm: 'ប្រាជួបគិរីខ័ន្ធ',
    provinceEn: 'Prachuap Khiri Khan',
    commandKm: 'កងពលអាកាសទី៥',
    lat: 11.7885,
    lng: 99.8038,
    elevationM: 5,
    established: '1922',
    facilityTypeKm: 'មូលដ្ឋានយន្តហោះវាយប្រហារធុនស្រាល និងល្បាតឆ្នេរ',
    runwayOrPort: 'ផ្លូវរត់ 1,800 m (VTBP)',
    summaryKm: 'មូលដ្ឋានទ័ពអាកាសប្រវត្តិសាស្ត្រនៅឈូងសមុទ្រអាវម៉ាណាវ ប្រតិបត្តិការយន្តហោះ AU-23A Peacemaker សម្រាប់ការល្បាត និងគាំទ្រតាមតំបន់ឆ្នេរ។',
    keyUnitsKm: ['កងអនុសេនាធំទី៥០១ (AU-23A Peacemaker)'],
    isFighterBase: true,
    aircraftTypes: ['AU-23A Peacemaker'],
  },
  {
    id: 'rtaf-phitsanulok-wing46',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសពិស្ណុលោក (កងពលទី៤៦)',
    nameEn: 'Phitsanulok RTAF Base — Wing 46',
    nameTh: 'กองบิน 46 พิษณุโลก',
    branch: 'airforce',
    scale: 'major',
    region: 'north',
    provinceKm: 'ពិស្ណុលោក',
    provinceEn: 'Phitsanulok',
    commandKm: 'កងពលអាកាសទី៤៦',
    lat: 16.7829,
    lng: 100.2791,
    elevationM: 47,
    established: '1978',
    facilityTypeKm: 'មូលដ្ឋានដឹកជញ្ជូនយុទ្ធសាស្ត្រ និងគាំទ្រភាគខាងជើង',
    runwayOrPort: 'ផ្លូវរត់ 3,000 m (VTPP)',
    summaryKm: 'មូលដ្ឋានកងពលអាកាសទី៤៦ នៅខេត្តពិស្ណុលោក ប្រតិបត្តិការយន្តហោះដឹកជញ្ជូន BT-67 និងគាំទ្រការពារដែនអាកាសភាគខាងជើង។',
    keyUnitsKm: ['កងអនុសេនាធំទី៤៦១ (BT-67)'],
  },
  {
    id: 'rtaf-kamphaeng-saen',
    nameKm: 'សាលាហ្វឹកហ្វឺនហោះហើរ កំផែងសែន',
    nameEn: 'Kamphaeng Saen Flying Training School',
    nameTh: 'โรงเรียนการบินกำแพงแสน',
    branch: 'airforce',
    scale: 'major',
    region: 'central',
    provinceKm: 'នគរបឋម',
    provinceEn: 'Nakhon Pathom',
    commandKm: 'សាលាអាកាសចរណ៍កងទ័ពអាកាស',
    lat: 14.1016,
    lng: 99.9175,
    elevationM: 10,
    established: '1969',
    facilityTypeKm: 'មជ្ឈមណ្ឌលបណ្តុះបណ្តាលអាកាសយានិក',
    runwayOrPort: 'ផ្លូវរត់ 2,743 m (VTBK)',
    summaryKm: 'មជ្ឈមណ្ឌលបណ្តុះបណ្តាលអាកាសយានិកយោធាដ៏ធំនៅខេត្តនគរបឋម ភាគខាងលិចក្រុងបាងកក។',
    keyUnitsKm: ['កងអនុសេនាធំហ្វឹកហ្វឺនទី១-៣'],
  },
  {
    id: 'rtaf-watthana-nakhon',
    nameKm: 'មូលដ្ឋានទ័ពអាកាសវឌ្ឍនានគរ (កងពលទី៣)',
    nameEn: 'Watthana Nakhon RTAF Base — Wing 3',
    nameTh: 'กองบิน 3 วัฒนานคร',
    branch: 'airforce',
    scale: 'camp',
    region: 'east',
    provinceKm: 'សាកែវ',
    provinceEn: 'Sa Kaeo',
    commandKm: 'កងពលអាកាសទី៣ (យានអាកាសគ្មានមនុស្សបើក)',
    lat: 13.7689,
    lng: 102.3156,
    elevationM: 71,
    established: '2020',
    facilityTypeKm: 'មូលដ្ឋាន UAV និងល្បាតដែនអាកាសខាងកើត',
    runwayOrPort: 'ផ្លូវរត់ 1,500 m (VTBW)',
    summaryKm: 'មូលដ្ឋានកងពលអាកាសទី៣ នៅខេត្តសាកែវ ចម្ងាយប្រហែល ២៩ គ.ម ពីច្រកព្រំដែនអារញ្ញប្រាថេត-ប៉ោយប៉ែត ប្រតិបត្តិការយានអាកាសគ្មានមនុស្សបើក (UAV)។',
    keyUnitsKm: ['កងអនុសេនាធំទី៣០១', 'កងអនុសេនាធំទី៣០២ (UAV)'],
  },
  {
    id: 'rtn-sattahip',
    nameKm: 'មូលដ្ឋានទ័ពជើងទឹកសាត់តាហ៊ីប',
    nameEn: 'Sattahip Naval Base',
    nameTh: 'ฐานทัพเรือสัตหีบ',
    branch: 'navy',
    scale: 'major',
    region: 'east',
    provinceKm: 'ឈុនបុរី',
    provinceEn: 'Chonburi',
    commandKm: 'កងនាវាចរភូមិន្ទថៃ (ភូមិភាគជើងទឹកទី១)',
    lat: 12.6584,
    lng: 100.9022,
    elevationM: 8,
    established: '1922',
    facilityTypeKm: 'មូលដ្ឋានកងនាវាចម្បាំងធំជាងគេ',
    runwayOrPort: 'កំពង់ផែទឹកជ្រៅ ជុកសាម៉េត (Chuk Samet Deep-Water Port)',
    summaryKm: 'មូលដ្ឋានទ័ពជើងទឹកធំបំផុតរបស់ប្រទេសថៃ ស្ថិតនៅឈូងសមុទ្រថៃភាគខាងកើត ជាទីតាំងចតនាវាផ្ទុកយន្តហោះ HTMS Chakri Naruebet និងកងទាហានម៉ារីន។',
    keyUnitsKm: ['កងនាវាចរភូមិន្ទថៃ', 'បញ្ជាការដ្ឋានទាហានម៉ារីន', 'កំពង់ផែជុកសាម៉េត'],
  },
  {
    id: 'rtn-utapao',
    nameKm: 'អាកាសយានដ្ឋានទ័ពជើងទឹក អ៊ូតាប៉ាវ',
    nameEn: 'U-Tapao Royal Thai Navy Airfield',
    nameTh: 'สนามบินอู่ตะเภา (กองการบินทหารเรือ)',
    branch: 'navy',
    scale: 'major',
    region: 'east',
    provinceKm: 'រ៉ាយ៉ង',
    provinceEn: 'Rayong',
    commandKm: 'កងអាកាសចរណ៍ជើងទឹក',
    lat: 12.6799,
    lng: 101.005,
    elevationM: 13,
    established: '1966',
    facilityTypeKm: 'មូលដ្ឋានអាកាសចរណ៍ជើងទឹក និងអាកាសយានដ្ឋានអន្តរជាតិ',
    runwayOrPort: 'ផ្លូវរត់ 3,505 m (VTBU)',
    summaryKm: 'អាកាសយានដ្ឋានយោធា-ស៊ីវិលដ៏ធំនៅជាប់សាត់តាហ៊ីប មានផ្លូវរត់វែងសម្រាប់យន្តហោះល្បាតដែនសមុទ្រ និងយន្តហោះដឹកជញ្ជូនធុនធ្ងន់។',
    keyUnitsKm: ['កងពលអាកាសចរណ៍ជើងទឹក', 'កងអនុសេនាធំល្បាតសមុទ្រ'],
  },
  {
    id: 'rtn-hq-wangderm',
    nameKm: 'ទីបញ្ជាការដ្ឋានកងទ័ពជើងទឹក (វាំងដើម)',
    nameEn: 'Royal Thai Navy HQ — Wang Derm Palace',
    nameTh: 'กองบัญชาการกองทัพเรือ (พระราชวังเดิม)',
    branch: 'navy',
    scale: 'major',
    region: 'central',
    provinceKm: 'បាងកក',
    provinceEn: 'Bangkok',
    commandKm: 'ទីបញ្ជាការកងទ័ពជើងទឹក',
    lat: 13.7438,
    lng: 100.4904,
    elevationM: 3,
    established: '1900',
    facilityTypeKm: 'ទីបញ្ជាការដ្ឋានកងទ័ពជើងទឹក',
    summaryKm: 'ទីបញ្ជាការកំពូលរបស់កងទ័ពជើងទឹកភូមិន្ទថៃ ស្ថិតនៅបរិវេណវាំងដើម ត្រើយខាងលិចទន្លេចៅប្រាយ៉ា ទល់មុខវត្តអរុណ ក្រុងបាងកក។',
    keyUnitsKm: ['ការិយាល័យមេបញ្ជាការជើងទឹក', 'អគ្គសេនាធិការជើងទឹក'],
  },
  {
    id: 'rtn-songkhla-2nd',
    nameKm: 'មូលដ្ឋានទ័ពជើងទឹកសុងខ្លា (ភូមិភាគទី២)',
    nameEn: 'Songkhla Naval Base — 2nd Naval Area',
    nameTh: 'ทัพเรือภาคที่ 2 สงขลา',
    branch: 'navy',
    scale: 'major',
    region: 'south',
    provinceKm: 'សុងខ្លា',
    provinceEn: 'Songkhla',
    commandKm: 'ភូមិភាគជើងទឹកទី២',
    lat: 7.1945,
    lng: 100.6012,
    elevationM: 5,
    established: '1992',
    facilityTypeKm: 'មូលដ្ឋានការពារឈូងសមុទ្រថៃភាគខាងត្បូង',
    runwayOrPort: 'កំពង់ផែទ័ពជើងទឹកសុងខ្លា & ផ្លូវរត់ 1,500 m',
    summaryKm: 'បញ្ជាការដ្ឋានគ្រប់គ្រងសន្តិសុខដែនសមុទ្រ និងតំបន់សេដ្ឋកិច្ចផ្តាច់មុខនៅឈូងសមុទ្រថៃភាគខាងត្បូង។',
    keyUnitsKm: ['ភូមិភាគជើងទឹកទី២', 'មូលដ្ឋានជើងទឹកសុងខ្លា'],
  },
  {
    id: 'rtn-phangnga-3rd',
    nameKm: 'មូលដ្ឋានទ័ពជើងទឹកផាំងង៉ា (ភូមិភាគទី៣)',
    nameEn: 'Phang Nga Naval Base — 3rd Naval Area',
    nameTh: 'ฐานทัพเรือพังงา (ทัพเรือภาคที่ 3)',
    branch: 'navy',
    scale: 'major',
    region: 'south',
    provinceKm: 'ផាំងង៉ា',
    provinceEn: 'Phang Nga',
    commandKm: 'ភូមិភាគជើងទឹកទី៣ (សមុទ្រអាន់ដាម៉ាន់)',
    lat: 8.5732,
    lng: 98.2215,
    elevationM: 7,
    established: '1982',
    facilityTypeKm: 'មូលដ្ឋានកងនាវាសមុទ្រអាន់ដាម៉ាន់',
    runwayOrPort: 'កំពង់ផែទឹកជ្រៅ ថាបឡាមុ (Thap Lamu)',
    summaryKm: 'មូលដ្ឋានទ័ពជើងទឹកសំខាន់នៅឆ្នេរសមុទ្រអាន់ដាម៉ាន់ ការពារដែនសមុទ្រភាគខាងលិច និងច្រកសមុទ្រម៉ាឡាកាភាគខាងជើង។',
    keyUnitsKm: ['ភូមិភាគជើងទឹកទី៣', 'មូលដ្ឋានជើងទឹកផាំងង៉ា'],
  },

  // ================= SMALLER REGIONAL CAMPS, MILITARY CIRCLES & BORDER POSTS (32) =================
  {
    id: 'camp-surasinghanat-aranya',
    nameKm: 'បន្ទាយសុរសីហនាថ (អារញ្ញប្រាថេត)',
    nameEn: 'Fort Surasinghanat — Burapha Task Force Camp',
    nameTh: 'ค่ายสุรสิงหนาท (อรัญประเทศ)',
    branch: 'army',
    scale: 'camp',
    region: 'east',
    provinceKm: 'សាកែវ',
    provinceEn: 'Sa Kaeo',
    commandKm: 'កងកម្លាំងបូព៌ា (យោធភូមិភាគទី១)',
    lat: 13.6889,
    lng: 102.5021,
    elevationM: 52,
    established: '1979',
    facilityTypeKm: 'បន្ទាយជួរមុខព្រំដែនអារញ្ញប្រាថេត',
    summaryKm: 'បន្ទាយកងវរសេនាធំថ្មើរជើងទី១២ និងកងទាហានព្រានជួរមុខ ស្ថិតនៅចម្ងាយប្រហែល ៧ គ.ម ពីច្រកព្រំដែនប៉ោយប៉ែត-អារញ្ញប្រាថេត។',
    keyUnitsKm: ['កងវរសេនាធំថ្មើរជើងទី១២ រក្សាព្រះអង្គ', 'កងវរសេនាធំទាហានព្រានទី១២'],
  },
  {
    id: 'camp-phairi-sakaeo',
    nameKm: 'បន្ទាយផៃរីរ៉ាយ៉ូដេត (មណ្ឌលយោធាទី១៩)',
    nameEn: 'Fort Phairi Rayodet — 19th Military Circle',
    nameTh: 'ค่ายไพรีระย่อเดช (มทบ.19)',
    branch: 'army',
    scale: 'camp',
    region: 'east',
    provinceKm: 'សាកែវ',
    provinceEn: 'Sa Kaeo',
    commandKm: 'យោធភូមិភាគទី១',
    lat: 13.8165,
    lng: 102.0734,
    elevationM: 46,
    established: '2015',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តសាកែវ',
    summaryKm: 'បន្ទាយមណ្ឌលយោធាខេត្តសាកែវ គ្រប់គ្រងភស្តុភារ និងសម្របសម្រួលកងកម្លាំងតាមបណ្តោយផ្លូវជាតិលេខ ៣៣ ឆ្ពោះទៅព្រំដែនខាងកើត។',
    keyUnitsKm: ['មណ្ឌលយោធាទី១៩', 'កងវរសេនាតូចគាំទ្រខេត្តសាកែវ'],
  },
  {
    id: 'camp-buriram-mtb26',
    nameKm: 'បន្ទាយសម្តេចចៅព្រះយ៉ាមហាក្សត្រសឹក (ម.ទ.ប.២៦)',
    nameEn: 'Fort Somdet Chao Phraya Mahakasatsuek — 26th Military Circle',
    nameTh: 'ค่ายสมเด็จเจ้าพระยามหากษัตริย์ศึก (มทบ.26)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'បុរីរម្យ',
    provinceEn: 'Buriram',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 14.9542,
    lng: 103.0955,
    elevationM: 162,
    established: '1984',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តបុរីរម្យ',
    summaryKm: 'បន្ទាយប្រចាំខេត្តបុរីរម្យ ស្ថិតនៅភាគខាងត្បូងក្រុងបុរីរម្យ ទទួលបន្ទុកគាំទ្រសន្តិសុខតាមជួរភ្នំដងរែក។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៦', 'កងវរសេនាតូចថ្មើរជើងទី៤ កងវរសេនាធំទី២៣'],
  },
  {
    id: 'camp-ranger26-lahansai',
    nameKm: 'បន្ទាយទាហានព្រានឡាហានសាយ (កងវរសេនាធំទី២៦)',
    nameEn: '26th Ranger Forces Regiment — Lahan Sai Camp',
    nameTh: 'กรมทหารพรานที่ 26 (ละหานทราย)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'បុរីរម្យ',
    provinceEn: 'Buriram',
    commandKm: 'កងកម្លាំងសុរនារី (យោធភូមិភាគទី២)',
    lat: 14.4152,
    lng: 102.8628,
    elevationM: 215,
    established: '1981',
    facilityTypeKm: 'បន្ទាយកងទាហានព្រានព្រំដែន',
    summaryKm: 'បន្ទាយតូចប្រចាំតំបន់ស្រុកឡាហានសាយ ជិតច្រកចុងសាយតាគូ តាមជួរភ្នំដងរែកភាគខាងត្បូងខេត្តបុរីរម្យ។',
    keyUnitsKm: ['កងវរសេនាធំទាហានព្រានទី២៦'],
  },
  {
    id: 'camp-kapchoeng-surin',
    nameKm: 'បន្ទាយកងកម្លាំងជួរមុខកាបឈើង (ចុងចម)',
    nameEn: 'Kap Choeng Border Sector Camp',
    nameTh: 'ฐานปฏิบัติการกาบเชิง (สุรินทร์)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'សុរិន្ទ្រ',
    provinceEn: 'Surin',
    commandKm: 'កងកម្លាំងសុរនារី',
    lat: 14.4725,
    lng: 103.5972,
    elevationM: 210,
    established: '1985',
    facilityTypeKm: 'បន្ទាយប្រតិបត្តិការព្រំដែនសុរិន្ទ្រ',
    summaryKm: 'បន្ទាយតូចប្រចាំស្រុកកាបឈើង ចម្ងាយប្រហែល ១០ គ.ម ពីច្រកព្រំដែនអូរស្មាច់-ចុងចម។',
    keyUnitsKm: ['កងអនុសេនាធំល្បាតព្រំដែនសុរិន្ទ្រ'],
  },
  {
    id: 'camp-kantharalak-sisaket',
    nameKm: 'បន្ទាយទាហានព្រានកន្ទរ៉ាឡាក់ (កងវរសេនាធំទី២៣)',
    nameEn: '23rd Ranger Forces Regiment — Kantharalak Camp',
    nameTh: 'กรมทหารพรานที่ 23 (กันทรลักษ์)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'ស៊ីសាកេត',
    provinceEn: 'Sisaket',
    commandKm: 'កងកម្លាំងសុរនារី (យោធភូមិភាគទី២)',
    lat: 14.6368,
    lng: 104.6512,
    elevationM: 148,
    established: '1980',
    facilityTypeKm: 'បន្ទាយកងទាហានព្រានខេត្តស៊ីសាកេត',
    summaryKm: 'បន្ទាយកងវរសេនាធំទាហានព្រានទី២៣ នៅស្រុកកន្ទរ៉ាឡាក់ ខេត្តស៊ីសាកេត ភាគខាងជើងជួរភ្នំដងរែក និងតំបន់ព្រំដែនព្រះវិហារ។',
    keyUnitsKm: ['កងវរសេនាធំទាហានព្រានទី២៣', 'កងកម្លាំងពិសេសជួរមុខស៊ីសាកេត'],
  },
  {
    id: 'camp-trat-marines',
    nameKm: 'បន្ទាយកងកម្លាំងទាហានម៉ារីនខេត្តត្រាត',
    nameEn: 'Trat Marine Task Force Camp',
    nameTh: 'หน่วยเฉพาะกิจนาวิกโยธินตราด',
    branch: 'navy',
    scale: 'camp',
    region: 'east',
    provinceKm: 'ត្រាត',
    provinceEn: 'Trat',
    commandKm: 'បញ្ជាការដ្ឋានការពារព្រំដែនចន្ទបុរី-ត្រាត',
    lat: 12.2485,
    lng: 102.5192,
    elevationM: 14,
    established: '1979',
    facilityTypeKm: 'បន្ទាយទាហានម៉ារីនប្រចាំខេត្តត្រាត',
    summaryKm: 'បន្ទាយកងកម្លាំងម៉ារីននៅក្រុងត្រាត ទទួលបន្ទុកការពារព្រំដែនដីគោក និងកោះនានានៅឆ្នេរសមុទ្រខេត្តត្រាត។',
    keyUnitsKm: ['កងកម្លាំងពិសេសម៉ារីនត្រាត'],
  },
  {
    id: 'camp-khlongyai-trat',
    nameKm: 'បន្ទាយទាហានម៉ារីនខ្លងយ៉ៃ (ហាតឡេក)',
    nameEn: 'Khlong Yai Marine Border Camp (Hat Lek)',
    nameTh: 'ชุดควบคุมทหารพรานนาวิกโยธินคลองใหญ่',
    branch: 'navy',
    scale: 'camp',
    region: 'east',
    provinceKm: 'ត្រាត',
    provinceEn: 'Trat',
    commandKm: 'ទាហានម៉ារីនថៃ (កងទ័ពជើងទឹក)',
    lat: 11.7782,
    lng: 102.8856,
    elevationM: 12,
    established: '1982',
    facilityTypeKm: 'បន្ទាយឆ្នេរសមុទ្រ និងព្រំដែនខ្លងយ៉ៃ',
    summaryKm: 'បន្ទាយតូចនៅចុងភាគអាគ្នេយ៍ខេត្តត្រាត តាមច្រកតូចចង្អៀតរវាងជួរភ្នំបន្ទាត់ និងឈូងសមុទ្រថៃ ជិតច្រកចាំយាម-កោះកុង។',
    keyUnitsKm: ['កងទាហានព្រានម៉ារីនខ្លងយ៉ៃ'],
  },
  {
    id: 'camp-nawamin-chonburi',
    nameKm: 'បន្ទាយនវមិន្ទ្រាជិនី (កងវរសេនាធំទី២១)',
    nameEn: "Fort Nawamintharachini — 21st Infantry Regiment Queen's Guard",
    nameTh: 'ค่ายนวมินทราชินี (ร.21 รอ.)',
    branch: 'army',
    scale: 'camp',
    region: 'east',
    provinceKm: 'ឈុនបុរី',
    provinceEn: 'Chonburi',
    commandKm: 'កងពលតូចថ្មើរជើងទី២ (យោធភូមិភាគទី១)',
    lat: 13.3685,
    lng: 101.0012,
    elevationM: 18,
    established: '1950',
    facilityTypeKm: 'បន្ទាយកងវរសេនាធំថ្មើរជើងឈុនបុរី',
    summaryKm: 'បន្ទាយកងវរសេនាធំថ្មើរជើងទី២១ រក្សាព្រះអង្គ ស្ថិតនៅក្រុងឈុនបុរី ជិតតំបន់សេដ្ឋកិច្ចភាគខាងកើត។',
    keyUnitsKm: ['កងវរសេនាធំថ្មើរជើងទី២១', 'មណ្ឌលយោធាទី១៤'],
  },
  {
    id: 'camp-siphatcharin-khonkaen',
    nameKm: 'បន្ទាយស្រីផាត់ឆារិន (មណ្ឌលយោធាទី២៣)',
    nameEn: 'Fort Si Phatcharin — 23rd Military Circle',
    nameTh: 'ค่ายศรีพัชรินทร (มทบ.23)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'ខនកែន',
    provinceEn: 'Khon Kaen',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 16.4582,
    lng: 102.8391,
    elevationM: 168,
    established: '1956',
    facilityTypeKm: 'មណ្ឌលយោធាកណ្តាលភូមិភាគឦសាន',
    summaryKm: 'បន្ទាយប្រចាំខេត្តខនកែន ជាមជ្ឈមណ្ឌលភស្តុភារ និងបញ្ជាការកងវរសេនាធំថ្មើរជើងទី៨ នៅចំកណ្តាលខ្ពង់រាបកូរ៉ាត់។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៣', 'កងវរសេនាធំថ្មើរជើងទី៨'],
  },
  {
    id: 'camp-prachak-udon',
    nameKm: 'បន្ទាយប្រាចាក់សិល្បាខម (មណ្ឌលយោធាទី២៤)',
    nameEn: 'Fort Prachak Silapakhom — 24th Military Circle',
    nameTh: 'ค่ายประจักษ์ศิลปาคม (มทบ.24)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'អ៊ូដនថានី',
    provinceEn: 'Udon Thani',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 17.3956,
    lng: 102.8012,
    elevationM: 174,
    established: '1941',
    facilityTypeKm: 'មណ្ឌលយោធាឦសានភាគខាងជើង',
    summaryKm: 'បន្ទាយមណ្ឌលយោធាទី២៤ ស្ថិតនៅក្រុងអ៊ូដនថានី គ្រប់គ្រងសន្តិសុខតំបន់ជាប់ទន្លេមេគង្គភាគខាងជើង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៤', 'កងវរសេនាធំថ្មើរជើងទី១៣'],
  },
  {
    id: 'camp-roiet-mtb27',
    nameKm: 'បន្ទាយព្រះពុទ្ធយ៉តហ្វា (មណ្ឌលយោធាទី២៧)',
    nameEn: 'Fort Somdet Phra Phutthayotfa — 27th Military Circle',
    nameTh: 'ค่ายสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (มทบ.27)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'រ៉យអែត',
    provinceEn: 'Roi Et',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 16.0385,
    lng: 103.6531,
    elevationM: 142,
    established: '1976',
    facilityTypeKm: 'បន្ទាយកងពលតូចថ្មើរជើងទី៦',
    summaryKm: 'បន្ទាយប្រចាំខេត្តរ៉យអែត ជាទីតាំងកងពលតូចថ្មើរជើងទី៦ និងមណ្ឌលយោធាទី២៧ នៅវាលទំនាបទន្លេជី។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៧', 'កងពលតូចថ្មើរជើងទី៦'],
  },
  {
    id: 'camp-sisongrak-loei',
    nameKm: 'បន្ទាយស្រីសងរ៉ាក់ (មណ្ឌលយោធាទី២៨)',
    nameEn: 'Fort Si Song Rak — 28th Military Circle',
    nameTh: 'ค่ายศรีสองรัก (มทบ.28)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'លើយ',
    provinceEn: 'Loei',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 17.4655,
    lng: 101.7341,
    elevationM: 252,
    established: '1983',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តលើយ',
    summaryKm: 'បន្ទាយប្រចាំខេត្តលើយ នៅតំបន់ភ្នំភាគពាយ័ព្យនៃភូមិភាគឦសាន ជាប់ព្រំដែនទន្លេហឿង-ឡាវ។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៨', 'កងវរសេនាតូចថ្មើរជើងទី១ កងវរសេនាធំទី៨'],
  },
  {
    id: 'camp-kritsiwara-sakon',
    nameKm: 'បន្ទាយក្រិតស៊ីវ៉ារ៉ា (មណ្ឌលយោធាទី២៩)',
    nameEn: 'Fort Krit Siwara — 29th Military Circle',
    nameTh: 'ค่ายกฤษณ์สีวะรา (มทบ.29)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'សកលនគរ',
    provinceEn: 'Sakon Nakhon',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 17.1684,
    lng: 104.1422,
    elevationM: 165,
    established: '1975',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តសកលនគរ',
    summaryKm: 'បន្ទាយយោធានៅក្រុងសកលនគរ ជិតជួរភ្នំភូផាន និងបឹងណងហាន គ្រប់គ្រងភូមិភាគឦសានខាងលើ។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២៩', 'កងវរសេនាធំថ្មើរជើងទី៣'],
  },
  {
    id: 'camp-phrayot-nakhonphanom',
    nameKm: 'បន្ទាយព្រះយ៉តមឿងខ្វាង (មណ្ឌលយោធាទី២១០)',
    nameEn: 'Fort Phra Yot Mueang Khwang — 210th Military Circle',
    nameTh: 'ค่ายพระยอดเมืองขวาง (มทบ.210)',
    branch: 'army',
    scale: 'camp',
    region: 'northeast',
    provinceKm: 'នគរភ្នំ',
    provinceEn: 'Nakhon Phanom',
    commandKm: 'យោធភូមិភាគទី២',
    lat: 17.3921,
    lng: 104.7652,
    elevationM: 146,
    established: '1972',
    facilityTypeKm: 'បន្ទាយតាមដងទន្លេមេគង្គ',
    summaryKm: 'បន្ទាយតូចតាមបណ្តោយដងទន្លេមេគង្គ ខេត្តនគរភ្នំ សម្រាប់ការពារព្រំដែនទន្លេមេគង្គជាប់ខេត្តខាំមួន ប្រទេសឡាវ។',
    keyUnitsKm: ['មណ្ឌលយោធាទី២១០', 'កងវរសេនាតូចថ្មើរជើងទី៣ កងវរសេនាធំទី៣'],
  },
  {
    id: 'camp-surasi-kanchanaburi',
    nameKm: 'បន្ទាយសុរសីហ៍ (កងពលតូចថ្មើរជើងទី៩)',
    nameEn: 'Fort Surasi — 9th Infantry Division',
    nameTh: 'ค่ายสุรสีห์ (กองพลทหารราบที่ 9)',
    branch: 'army',
    scale: 'camp',
    region: 'central',
    provinceKm: 'កញ្ចនបុរី',
    provinceEn: 'Kanchanaburi',
    commandKm: 'យោធភូមិភាគទី១',
    lat: 14.0842,
    lng: 99.4395,
    elevationM: 58,
    established: '1971',
    facilityTypeKm: 'បន្ទាយការពារព្រំដែនភាគខាងលិច',
    summaryKm: 'បន្ទាយកងពលតូចថ្មើរជើងទី៩ នៅខេត្តកញ្ចនបុរី ទទួលបន្ទុកតំបន់ព្រំដែនភាគខាងលិចជាប់ប្រទេសមីយ៉ាន់ម៉ា។',
    keyUnitsKm: ['កងពលតូចថ្មើរជើងទី៩', 'កងកម្លាំងសុរសីហ៍'],
  },
  {
    id: 'camp-panurangsi-ratchaburi',
    nameKm: 'បន្ទាយភានុរង្សី (នាយកដ្ឋានវិស្វកម្មកងទ័ព)',
    nameEn: 'Fort Panurangsi — Army Engineer Department',
    nameTh: 'ค่ายภาณุรังษี (กรมการทหารช่าง)',
    branch: 'army',
    scale: 'camp',
    region: 'central',
    provinceKm: 'រាជបុរី',
    provinceEn: 'Ratchaburi',
    commandKm: 'នាយកដ្ឋានវិស្វកម្មជើងគោក',
    lat: 13.5324,
    lng: 99.8214,
    elevationM: 12,
    established: '1911',
    facilityTypeKm: 'បន្ទាយវិស្វកម្មកងទ័ពជើងគោក',
    summaryKm: 'មជ្ឈមណ្ឌលកងវិស្វកម្មសំណង់ ស្ពាន និងបោសសម្អាតមីនរបស់កងទ័ពជើងគោកថៃ ស្ថិតនៅតាមដងទន្លេម៉ែខ្លង។',
    keyUnitsKm: ['នាយកដ្ឋានវិស្វកម្មកងទ័ព', 'មណ្ឌលយោធាទី១៦'],
  },
  {
    id: 'camp-thanarat-prachuap',
    nameKm: 'បន្ទាយធនរ័ត្ន (មជ្ឈមណ្ឌលទ័ពថ្មើរជើង)',
    nameEn: 'Fort Thanarat — Royal Thai Army Infantry Center',
    nameTh: 'ค่ายธนะรัชต์ (ศูนย์การทหารราบ)',
    branch: 'army',
    scale: 'camp',
    region: 'central',
    provinceKm: 'ប្រាជួបគិរីខ័ន្ធ',
    provinceEn: 'Prachuap Khiri Khan',
    commandKm: 'មជ្ឈមណ្ឌលទ័ពថ្មើរជើង',
    lat: 12.3885,
    lng: 99.9142,
    elevationM: 28,
    established: '1964',
    facilityTypeKm: 'មជ្ឈមណ្ឌលហ្វឹកហ្វឺនទ័ពថ្មើរជើង',
    summaryKm: 'បន្ទាយហ្វឹកហ្វឺនទ័ពថ្មើរជើងដ៏ធំនៅស្រុកប្រាណបុរី ភាគខាងត្បូងហួហ៊ីន ជាច្រកចូលទៅកាន់ឧបទ្វីបភាគខាងត្បូង។',
    keyUnitsKm: ['សាលាទ័ពថ្មើរជើង', 'កងវរសេនាធំហ្វឹកហ្វឺន'],
  },
  {
    id: 'camp-ramratchaniwet-phetchaburi',
    nameKm: 'បន្ទាយរាមរាជនិវេសន៍ (មណ្ឌលយោធាទី១៥)',
    nameEn: 'Fort Ramratchaniwet — 15th Military Circle',
    nameTh: 'ค่ายรามราชนิเวศน์ (มทบ.15)',
    branch: 'army',
    scale: 'camp',
    region: 'central',
    provinceKm: 'ពេជ្របុរី',
    provinceEn: 'Phetchaburi',
    commandKm: 'យោធភូមិភាគទី១',
    lat: 13.1008,
    lng: 99.9472,
    elevationM: 10,
    established: '1918',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តពេជ្របុរី',
    summaryKm: 'បន្ទាយប្រវត្តិសាស្ត្រនៅក្រុងពេជ្របុរី គ្រប់គ្រងមណ្ឌលយោធាទី១៥ តាមច្រកផ្លូវជាតិលេខ ៤។',
    keyUnitsKm: ['មណ្ឌលយោធាទី១៥'],
  },
  {
    id: 'camp-jiraprawat-nakhonsawan',
    nameKm: 'បន្ទាយជីរ៉ាប្រាវ៉ាត់ (មណ្ឌលយោធាទី៣១)',
    nameEn: 'Fort Jiraprawat — 31st Military Circle',
    nameTh: 'ค่ายจิรประวัติ (มทบ.31)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'នគរសួគ៌',
    provinceEn: 'Nakhon Sawan',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 15.6789,
    lng: 100.1456,
    elevationM: 31,
    established: '1908',
    facilityTypeKm: 'មណ្ឌលយោធាច្រកទ្វារភាគខាងជើង',
    summaryKm: 'បន្ទាយនៅចំណុចប្រសព្វទន្លេចៅប្រាយ៉ា ខេត្តនគរសួគ៌ ជាច្រកទ្វារយុទ្ធសាស្ត្ររវាងវាលទំនាបកណ្តាល និងភាគខាងជើង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣១', 'កងវរសេនាធំថ្មើរជើងទី៤'],
  },
  {
    id: 'camp-mengrai-chiangrai',
    nameKm: 'បន្ទាយម៉េងរ៉ាយមហារាជ (មណ្ឌលយោធាទី៣៧)',
    nameEn: 'Fort Mengrai Maharat — 37th Military Circle',
    nameTh: 'ค่ายเม็งรายมหาราช (มทบ.37)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'ឈៀងរ៉ាយ',
    provinceEn: 'Chiang Rai',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 19.9045,
    lng: 99.8452,
    elevationM: 392,
    established: '1970',
    facilityTypeKm: 'បន្ទាយតំបន់ត្រីកោណមាស',
    summaryKm: 'បន្ទាយភាគខាងជើងបំផុតរបស់ថៃនៅខេត្តឈៀងរ៉ាយ គ្រប់គ្រងសន្តិសុខព្រំដែនតំបន់ត្រីកោណមាស (ថៃ-មីយ៉ាន់ម៉ា-ឡាវ)។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣៧', 'កងកម្លាំងផាមឿង'],
  },
  {
    id: 'camp-khunchueang-phayao',
    nameKm: 'បន្ទាយឃុនជឿងធម្មិករាជ (មណ្ឌលយោធាទី៣៤)',
    nameEn: 'Fort Khun Chueang Thammikkarat — 34th Military Circle',
    nameTh: 'ค่ายขุนเจืองธรรมิกราช (มทบ.34)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'ផាយ៉ៅ',
    provinceEn: 'Phayao',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 19.1662,
    lng: 99.9081,
    elevationM: 405,
    established: '1980',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តផាយ៉ៅ',
    summaryKm: 'បន្ទាយតូចនៅជ្រលងភ្នំខេត្តផាយ៉ៅ គ្រប់គ្រងច្រកផ្លូវភាគឦសាននៃភូមិភាគខាងជើង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣៤', 'កងវរសេនាធំថ្មើរជើងទី១៧'],
  },
  {
    id: 'camp-suriyaphong-nan',
    nameKm: 'បន្ទាយសុរិយាពង្ស (មណ្ឌលយោធាទី៣៨)',
    nameEn: 'Fort Suriyaphong — 38th Military Circle',
    nameTh: 'ค่ายสุริยพงษ์ (มทบ.38)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'ណាន',
    provinceEn: 'Nan',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 18.7862,
    lng: 100.7854,
    elevationM: 215,
    established: '1972',
    facilityTypeKm: 'មណ្ឌលយោធាជួរភ្នំខេត្តណាន',
    summaryKm: 'បន្ទាយប្រចាំខេត្តណាន តាមដងទន្លេណាន ការពារព្រំដែនភ្នំភាគខាងជើងជាប់ប្រទេសឡាវ។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣៨', 'កងវរសេនាធំទាហានព្រានទី៣២'],
  },
  {
    id: 'camp-phichai-uttaradit',
    nameKm: 'បន្ទាយពិជ័យដាបហាក់ (មណ្ឌលយោធាទី៣៥)',
    nameEn: 'Fort Phichai Dap Hak — 35th Military Circle',
    nameTh: 'ค่ายพิชัยดาบหัก (มทบ.35)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'ឧត្តរឌិត្ថ',
    provinceEn: 'Uttaradit',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 17.6245,
    lng: 100.0956,
    elevationM: 72,
    established: '1938',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តឧត្តរឌិត្ថ',
    summaryKm: 'បន្ទាយប្រចាំខេត្តឧត្តរឌិត្ថ នៅចំណុចភ្ជាប់ផ្លូវដែកភាគខាងជើង និងព្រំដែនឡាវ។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣៥'],
  },
  {
    id: 'camp-wachiraprakan-tak',
    nameKm: 'បន្ទាយវជិរប្រាកាន (មណ្ឌលយោធាទី៣១០)',
    nameEn: 'Fort Wachiraprakan — 310th Military Circle',
    nameTh: 'ค่ายวชิรปราการ (มทบ.310)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'តាក',
    provinceEn: 'Tak',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 16.8742,
    lng: 99.1265,
    elevationM: 122,
    established: '1978',
    facilityTypeKm: 'បន្ទាយច្រកព្រំដែនម៉ែសត-តាក',
    summaryKm: 'បន្ទាយគ្រប់គ្រងច្រករបៀងសេដ្ឋកិច្ច និងព្រំដែនភាគខាងលិចខេត្តតាក-ម៉ែសត ជាប់រដ្ឋកាយីន មីយ៉ាន់ម៉ា។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣១០', 'កងកម្លាំងរាជមនូ'],
  },
  {
    id: 'camp-phokhun-phetchabun',
    nameKm: 'បន្ទាយផូឃុនផាមឿង (មណ្ឌលយោធាទី៣៦)',
    nameEn: 'Fort Phokhun Pha Mueang — 36th Military Circle',
    nameTh: 'ค่ายพ่อขุนผาเมือง (มทบ.36)',
    branch: 'army',
    scale: 'camp',
    region: 'north',
    provinceKm: 'ពេជ្របូរណ៍',
    provinceEn: 'Phetchabun',
    commandKm: 'យោធភូមិភាគទី៣',
    lat: 16.4342,
    lng: 101.1585,
    elevationM: 125,
    established: '1979',
    facilityTypeKm: 'បន្ទាយកងពលតូចទ័ពសេះទី១',
    summaryKm: 'បន្ទាយនៅជ្រលងភ្នំពេជ្របូរណ៍ ជាទីតាំងនៃកងពលតូចទ័ពសេះទី១ គ្របដណ្តប់តំបន់កណ្តាល-ខាងជើង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៣៦', 'កងពលតូចទ័ពសេះទី១'],
  },
  {
    id: 'camp-khetudomsak-chumphon',
    nameKm: 'បន្ទាយខេត្តឧត្តមស័ក្តិ (មណ្ឌលយោធាទី៤៤)',
    nameEn: 'Fort Khet Udomsak — 44th Military Circle',
    nameTh: 'ค่ายเขตอุดมศักดิ์ (มทบ.44)',
    branch: 'army',
    scale: 'camp',
    region: 'south',
    provinceKm: 'ឈុមផន',
    provinceEn: 'Chumphon',
    commandKm: 'យោធភូមិភាគទី៤',
    lat: 10.4885,
    lng: 99.1742,
    elevationM: 14,
    established: '1979',
    facilityTypeKm: 'បន្ទាយច្រកចូលឧបទ្វីបភាគខាងត្បូង',
    summaryKm: 'បន្ទាយនៅច្រកដីក្រៈ (Kra Isthmus) ខេត្តឈុមផន ជាចំណុចតភ្ជាប់រវាងឈូងសមុទ្រថៃ និងសមុទ្រអាន់ដាម៉ាន់។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៤៤', 'កងវរសេនាធំថ្មើរជើងទី២៥'],
  },
  {
    id: 'camp-vibhavadi-surat',
    nameKm: 'បន្ទាយវិភាវឌីរង្ស៊ីត (មណ្ឌលយោធាទី៤៥)',
    nameEn: 'Fort Vibhavadi Rangsit — 45th Military Circle',
    nameTh: 'ค่ายวิภาวดีรังสิต (มทบ.45)',
    branch: 'army',
    scale: 'camp',
    region: 'south',
    provinceKm: 'សុរ៉ាត់ថានី',
    provinceEn: 'Surat Thani',
    commandKm: 'យោធភូមិភាគទី៤',
    lat: 9.1255,
    lng: 99.3282,
    elevationM: 10,
    established: '1977',
    facilityTypeKm: 'មណ្ឌលយោធាខេត្តសុរ៉ាត់ថានី',
    summaryKm: 'បន្ទាយប្រចាំក្រុងសុរ៉ាត់ថានី ក្បែរដងទន្លេតាពី និងមូលដ្ឋានទ័ពអាកាសកងពលទី៧។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៤៥'],
  },
  {
    id: 'camp-thepsatri-thungsong',
    nameKm: 'បន្ទាយទេពស្ត្រីស្រីសុន្ទរ (មណ្ឌលយោធាទី៤៣)',
    nameEn: 'Fort Thepsatri Si Sunthon — 43rd Military Circle',
    nameTh: 'ค่ายเทพสตรีศรีสุนทร (มทบ.43)',
    branch: 'army',
    scale: 'camp',
    region: 'south',
    provinceKm: 'នគរស្រីធម្មរាជ',
    provinceEn: 'Nakhon Si Thammarat',
    commandKm: 'យោធភូមិភាគទី៤',
    lat: 8.1652,
    lng: 99.6841,
    elevationM: 48,
    established: '1965',
    facilityTypeKm: 'បន្ទាយកងពលតូចថ្មើរជើងទី៥',
    summaryKm: 'បន្ទាយនៅស្រុកធុងសុង ចំណុចប្រសព្វផ្លូវដែក និងផ្លូវគោកស្នូលនៃភាគខាងត្បូង។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៤៣', 'កងពលតូចថ្មើរជើងទី៥'],
  },
  {
    id: 'camp-ingkhayut-pattani',
    nameKm: 'បន្ទាយអ៊ីងខាយុទ្ធបរិហារ (មណ្ឌលយោធាទី៤៦)',
    nameEn: 'Fort Ingkhayutthaborihan — 46th Military Circle',
    nameTh: 'ค่ายอิงคยุทธบริหาร (มทบ.46)',
    branch: 'army',
    scale: 'camp',
    region: 'south',
    provinceKm: 'ប៉ាត់តានី',
    provinceEn: 'Pattani',
    commandKm: 'យោធភូមិភាគទី៤',
    lat: 6.8095,
    lng: 101.1842,
    elevationM: 15,
    established: '1950',
    facilityTypeKm: 'បន្ទាយសន្តិសុខខេត្តព្រំដែនភាគខាងត្បូង',
    summaryKm: 'បន្ទាយយោធាសំខាន់នៅស្រុកណងជីក ខេត្តប៉ាត់តានី គាំទ្រកងពលតូចថ្មើរជើងទី១៥។',
    keyUnitsKm: ['មណ្ឌលយោធាទី៤៦', 'កងពលតូចថ្មើរជើងទី១៥'],
  },
  {
    id: 'camp-sirindhorn-pattani',
    nameKm: 'បន្ទាយសិរិន្ទ្រ (ទីបញ្ជាការជួរមុខភាគខាងត្បូង)',
    nameEn: 'Fort Sirindhorn — ISOC Region 4 Forward HQ',
    nameTh: 'ค่ายสิรินธร (กอ.รมน.ภาค 4 ส่วนหน้า)',
    branch: 'army',
    scale: 'camp',
    region: 'south',
    provinceKm: 'ប៉ាត់តានី',
    provinceEn: 'Pattani',
    commandKm: 'យោធភូមិភាគទី៤ ជួរមុខ',
    lat: 6.6784,
    lng: 101.3185,
    elevationM: 22,
    established: '1984',
    facilityTypeKm: 'បន្ទាយបញ្ជាការជួរមុខខេត្តភាគខាងត្បូង',
    summaryKm: 'បន្ទាយបញ្ជាការជួរមុខនៅស្រុកយ៉ារ៉ាំង ខេត្តប៉ាត់តានី គ្រប់គ្រងការសម្របសម្រួលសន្តិសុខខេត្តប៉ាត់តានី យ៉ាឡា និងណារ៉ាធីវ៉ាត់។',
    keyUnitsKm: ['បញ្ជាការជួរមុខភូមិភាគទី៤'],
  },
  {
    id: 'camp-chulabhorn-narathiwat',
    nameKm: 'បន្ទាយជុលាភ័ណ្ឌ (ទាហានម៉ារីនណារ៉ាធីវ៉ាត់)',
    nameEn: 'Fort Chulabhorn — Narathiwat Marine Camp',
    nameTh: 'ค่ายจุฬาภรณ์ (นราธิวาส)',
    branch: 'navy',
    scale: 'camp',
    region: 'south',
    provinceKm: 'ណារ៉ាធីវ៉ាត់',
    provinceEn: 'Narathiwat',
    commandKm: 'កងទាហានម៉ារីន (កងទ័ពជើងទឹក)',
    lat: 6.4581,
    lng: 101.8152,
    elevationM: 8,
    established: '1973',
    facilityTypeKm: 'បន្ទាយទាហានម៉ារីនឆ្នេរសមុទ្រភាគខាងត្បូង',
    summaryKm: 'បន្ទាយកងទាហានម៉ារីននៅខេត្តណារ៉ាធីវ៉ាត់ ជិតព្រំដែនប្រទេសម៉ាឡេស៊ី និងឆ្នេរឈូងសមុទ្រថៃ។',
    keyUnitsKm: ['កងកម្លាំងពិសេសម៉ារីនណារ៉ាធីវ៉ាត់'],
  },
];

// Geodesic Haversine distance in kilometers
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  return R * c;
}

// Initial compass bearing in degrees (0 - 360)
export function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Project a destination point given origin, distance (km), and bearing (deg)
export function destinationPoint(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg: number
): [number, number] {
  const earthR = 6371;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const angDist = distanceKm / earthR;

  const sinLat = Math.sin(latRad) * Math.cos(angDist) + Math.cos(latRad) * Math.sin(angDist) * Math.cos(brng);
  const pLat = Math.asin(Math.max(-1, Math.min(1, sinLat)));
  const pLng =
    lngRad +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(latRad),
      Math.cos(angDist) - Math.sin(latRad) * Math.sin(pLat)
    );
  return [(pLng * 180) / Math.PI, (pLat * 180) / Math.PI];
}

export function bearingToCompassKm(deg: number): string {
  const dirs = ['ជើង', 'ឦសាន', 'កើត', 'អាគ្នេយ៍', 'ត្បូង', 'និរតី', 'លិច', 'ពាយ័ព្យ'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export function formatDMS(value: number, isLat: boolean): string {
  if (!Number.isFinite(value)) return '—';
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const totalTenths = Math.round(Math.abs(value) * 36000);
  const deg = Math.floor(totalTenths / 36000);
  const remAfterDeg = totalTenths % 36000;
  const min = Math.floor(remAfterDeg / 600);
  const sec = ((remAfterDeg % 600) / 10).toFixed(1);
  return `${deg}°${String(min).padStart(2, '0')}'${sec.padStart(4, '0')}"${dir}`;
}

export function getNearestCambodiaBorder(lat: number, lng: number): {
  ref: BorderReference;
  distanceKm: number;
} {
  let nearest = CAMBODIA_BORDER_REFS[0];
  let minDist = Infinity;
  for (const ref of CAMBODIA_BORDER_REFS) {
    const d = haversineKm(lat, lng, ref.lat, ref.lng);
    if (d < minDist) {
      minDist = d;
      nearest = ref;
    }
  }
  return { ref: nearest, distanceKm: minDist };
}

export interface RangeCircleFeature {
  type: 'Feature';
  properties: { radiusKm: number };
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

// Create a geodesic circle polygon GeoJSON for range rings
export function createRangeCircleGeoJSON(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps = 72
): RangeCircleFeature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearingDeg = (i * 360) / steps;
    coords.push(destinationPoint(centerLat, centerLng, radiusKm, bearingDeg));
  }

  return {
    type: 'Feature',
    properties: { radiusKm },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

// Create a geodesic radar sweep wedge polygon GeoJSON (trailing sector behind leading beam)
export function createRadarWedgeGeoJSON(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  beamAngleDeg: number,
  wedgeSpreadDeg = 38,
  steps = 20
): RangeCircleFeature {
  const coords: [number, number][] = [[centerLng, centerLat]];
  const startDeg = beamAngleDeg - wedgeSpreadDeg;
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + (wedgeSpreadDeg * i) / steps;
    coords.push(destinationPoint(centerLat, centerLng, radiusKm, deg));
  }
  coords.push([centerLng, centerLat]);

  return {
    type: 'Feature',
    properties: { radiusKm },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

// Approximate camera eye altitude in km from MapLibre zoom & latitude
export function zoomToAltitudeKm(zoom: number, lat: number): number {
  const earthCircumferenceKm = 40075.016686;
  const metersPerPixel =
    (earthCircumferenceKm * 1000 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  return Math.max(0.15, (metersPerPixel * 900) / 1000);
}

// Centered real high-resolution satellite snapshot (Web Mercator 3857, unstretched)
export function getSatelliteExportUrl(
  lat: number,
  lng: number,
  options?: { halfHeightKm?: number; width?: number; height?: number }
): string {
  const width = options?.width ?? 480;
  const height = options?.height ?? 270;
  const halfHeightKm = options?.halfHeightKm ?? 0.65;
  const aspect = width / height;
  const dLat = halfHeightKm / 111.32;
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLng = (halfHeightKm * aspect) / (111.32 * cosLat);
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat]
    .map((n) => n.toFixed(6))
    .join(',');
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${width},${height}&imageSR=3857&format=jpg&f=image`;
}

// Fast CDN-cached Esri satellite tile URL for list thumbnails and fallback
export function getSatelliteTileUrl(lat: number, lng: number, zoom = 15): string {
  const z = Math.max(10, Math.min(17, Math.round(zoom)));
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
}

export type ArsenalDensity = 'high' | 'medium' | 'low';

export interface PublicArsenalProfile {
  density: ArsenalDensity;
  densityLabelKm: string;
  densityShortKm: string;
  estimatedScaleScore: number;
  primaryCategoriesKm: string[];
  documentedSystems: string[];
  noteKm: string;
}

// Publicly documented order-of-battle & equipment class assessment (strictly open-source, non-live)
export function getPublicArsenalProfile(base: MilitaryBase): PublicArsenalProfile {
  const text = `${base.id} ${base.nameKm} ${base.nameEn} ${base.facilityTypeKm} ${base.summaryKm} ${base.keyUnitsKm.join(' ')}`.toLowerCase();

  // 1. Primary Combat Fighter Wings (F-16, Gripen, F-5TH)
  if (
    base.id === 'rtaf-korat-wing1' ||
    base.id === 'rtaf-takhli-wing4' ||
    base.id === 'rtaf-suratthani-wing7' ||
    base.id === 'rtaf-ubon-wing21'
  ) {
    return {
      density: 'high',
      densityLabelKm: 'ច្រើន (មូលដ្ឋានយុទ្ធសាស្ត្រស្នូល)',
      densityShortKm: 'ច្រើន',
      estimatedScaleScore: base.id === 'rtaf-korat-wing1' ? 94 : 88,
      primaryCategoriesKm: [
        'យន្តហោះចម្បាំងប្រចាំការ',
        'ឃ្លាំងមីស៊ីល និងគ្រាប់បែកអាកាស',
        'ប្រព័ន្ធរ៉ាដា និងការពារដែនអាកាស',
      ],
      documentedSystems: [
        ...(base.aircraftTypes ?? []),
        'AIM-120 / AIM-9 / IRIS-T (តាមឯកសារសាធារណៈ)',
        'ឃ្លាំងបេតុងការពារយន្តហោះ (HAS)',
      ],
      noteKm:
        'មូលដ្ឋានទ័ពអាកាសស្នូលដែលមានហ្វូងយន្តហោះចម្បាំង ផ្លូវរត់ 3,000m ឃ្លាំងយន្តហោះ និងស្តុកគ្រឿងបរិក្ខារអាកាសកម្រិតខ្ពស់តាមទិន្នន័យសាធារណៈ។',
    };
  }

  // 2. Secondary Light Attack Airbases & Forward Fighter Dispersal Airfields
  if (base.isFighterBase) {
    return {
      density: 'medium',
      densityLabelKm: 'មធ្យម (កងអាកាសវាយប្រហារ/បម្រុង)',
      densityShortKm: 'មធ្យម',
      estimatedScaleScore: base.scale === 'major' ? 68 : 56,
      primaryCategoriesKm: [
        'យន្តហោះវាយប្រហារស្រាល / បម្រុង',
        'ទីលានចត និងឃ្លាំងស្តុកប្រេងអាកាស',
      ],
      documentedSystems: [
        ...(base.aircraftTypes ?? []),
        'គ្រាប់បែក និងរ៉ុក្កែតអាកាស-ដី',
        'ប្រព័ន្ធគាំទ្រផ្លូវរត់យោធា',
      ],
      noteKm:
        'មូលដ្ឋានយន្តហោះវាយប្រហារស្រាល ឬអាកាសយានដ្ឋានបម្រុងសម្រាប់បញ្ជូនយន្តហោះចម្បាំងក្នុងករណីចាំបាច់។',
    };
  }

  // 3. Major Naval Fleet Bases (Sattahip / U-Tapao / Phang Nga / Songkhla)
  if (base.branch === 'navy' && base.scale === 'major') {
    const isSattahip = text.includes('sattahip') || text.includes('សត្តាហ៊ីប') || text.includes('u-tapao');
    return {
      density: isSattahip ? 'high' : 'medium',
      densityLabelKm: isSattahip ? 'ច្រើន (មូលដ្ឋាននាវាចម្បាំងធំបំផុត)' : 'មធ្យម (មូលដ្ឋានកងទ័ពជើងទឹក)',
      densityShortKm: isSattahip ? 'ច្រើន' : 'មធ្យម',
      estimatedScaleScore: isSattahip ? 92 : 66,
      primaryCategoriesKm: isSattahip
        ? ['នាវាចម្បាំង និងនាវាផ្ទុកឧទ្ធម្ភាគចក្រ', 'មីស៊ីលប្រឆាំងនាវា និងកាំភ្លើងជើងទឹក', 'កងម៉ារីន និងការពារឆ្នេរ']
        : ['នាវាល្បាតឆ្នេរសមុទ្រ', 'ប្រព័ន្ធរ៉ាដាដែនសមុទ្រ'],
      documentedSystems: isSattahip
        ? ['HTMS Chakri Naruebet', 'នាវាហ្វ្រីហ្គេត DW3000F / Naresuan', 'មីស៊ីល Harpoon / C-802A', 'រថពាសដែក AAV7A1']
        : ['នាវាល្បាត OPV / Fast Attack Craft', 'កាំភ្លើងការពារឆ្នេរ និងប្រព័ន្ធរ៉ាដា'],
      noteKm:
        'វាយតម្លៃតាមទិន្នន័យសាធារណៈនៃកងនាវាជើងទឹកភូមិន្ទថៃ និងកំពង់ផែយោធា។',
    };
  }

  // 4. Artillery Centers / Armor & Cavalry Divisions / Army Aviation / Major Combat Divisions
  if (
    text.includes('artillery') ||
    text.includes('កាំភ្លើងធំ') ||
    text.includes('cavalry') ||
    text.includes('រថក្រោះ') ||
    text.includes('រថពាសដែក') ||
    text.includes('ទ័ពសេះ') ||
    text.includes('aviation') ||
    text.includes('ឧទ្ធម្ភាគចក្រ') ||
    text.includes('special warfare') ||
    text.includes('ទ័ពពិសេស') ||
    text.includes('2nd infantry') ||
    text.includes('9th infantry') ||
    text.includes('suranaree') ||
    text.includes('សុរនារី')
  ) {
    const isArtillery = text.includes('artillery') || text.includes('កាំភ្លើងធំ');
    const isArmor =
      text.includes('cavalry') ||
      text.includes('រថក្រោះ') ||
      text.includes('រថពាសដែក') ||
      text.includes('ទ័ពសេះ') ||
      text.includes('2nd infantry');
    const isAviation = text.includes('aviation') || text.includes('ឧទ្ធម្ភាគចក្រ');

    return {
      density: base.scale === 'major' ? 'high' : 'medium',
      densityLabelKm:
        base.scale === 'major'
          ? 'ច្រើន (អង្គភាពអាវុធធ្ងន់ស្នូល)'
          : 'មធ្យម (កងពលជួរមុខ / យានយន្តប្រយុទ្ធ)',
      densityShortKm: base.scale === 'major' ? 'ច្រើន' : 'មធ្យម',
      estimatedScaleScore: base.scale === 'major' ? 86 : 62,
      primaryCategoriesKm: isArtillery
        ? ['កាំភ្លើងធំបាញ់ស្វ័យប្រវត្តិ 155mm', 'ប្រព័ន្ធរ៉ុក្កែតបាញ់ច្រើនគ្រាប់ (MLRS)', 'ឃ្លាំងគ្រាប់កាំភ្លើងធំ']
        : isArmor
          ? ['រថក្រោះប្រយុទ្ធសំខាន់ (MBT)', 'រថពាសដែកដឹកទ័ព (APC/IFV)', 'អាវុធប្រឆាំងរថក្រោះ']
          : isAviation
            ? ['ឧទ្ធម្ភាគចក្រប្រយុទ្ធ និងដឹកជញ្ជូន', 'ឃ្លាំងថែទាំ និងប្រេងឥន្ធនៈអាកាស']
            : ['រថពាសដែក និងអាវុធគាំទ្រថ្មើរជើង', 'កាំភ្លើងត្បាល់ និងអាវុធធ្ងន់កងពល'],
      documentedSystems: isArtillery
        ? ['CAESAR 155mm', 'ATMOS 2000 155mm', 'M198 / LG1 Mk II', 'DTI-1G / SR-4 MLRS']
        : isArmor
          ? ['VT-4 MBT', 'T-84 Oplot-M', 'M60A3', 'Stryker M1126 / BTR-3E1']
          : isAviation
            ? ['UH-60 Black Hawk', 'AH-1F Cobra', 'Mi-17V-5', 'Bell 212 / AS550']
            : ['Stryker / BTR-3E1', 'កាំភ្លើងធំគាំទ្រ 105mm/155mm', 'អាវុធថ្មើរជើងស្តង់ដារ'],
      noteKm:
        'កម្រិតអាវុធធ្ងន់ផ្អែកលើរចនាសម្ព័ន្ធកងពលសាធារណៈរបស់កងទ័ពជើងគោកថៃ (មិនមែនជាការរាប់ផ្ទាល់តាមពេលវេលាជាក់ស្តែងទេ)។',
    };
  }

  // 5. Major Regional HQs / Support Airbases / Training Centers
  if (base.scale === 'major' || base.branch === 'hq') {
    return {
      density: 'medium',
      densityLabelKm: 'មធ្យម (ទីបញ្ជាការ និងភស្តុភារ)',
      densityShortKm: 'មធ្យម',
      estimatedScaleScore: 56,
      primaryCategoriesKm:
        base.branch === 'airforce'
          ? ['យន្តហោះដឹកជញ្ជូន និងសង្កេតការណ៍', 'ទីលានហោះហើរ និងភស្តុភារ']
          : ['ទីបញ្ជាការដ្ឋាន និងបណ្តាញទំនាក់ទំនង', 'អង្គភាពការពារមូលដ្ឋាន និងយានយន្តយោធា'],
      documentedSystems:
        base.branch === 'airforce'
          ? ['C-130H Hercules', 'BT-67 / Airbus Transport', 'យន្តហោះសង្កេតការណ៍ និងហ្វឹកហាត់']
          : ['យានយន្តបញ្ជាការ និងទំនាក់ទំនង', 'អាវុធធុនស្រាល និងកងការពារបញ្ជាការដ្ឋាន'],
      noteKm:
        'មូលដ្ឋានផ្តោតសំខាន់លើការបញ្ជាការ ភស្តុភារ ការដឹកជញ្ជូន ឬការហ្វឹកហាត់ ដោយមានស្តុកអាវុធធ្ងន់តិចជាងកងពលប្រយុទ្ធផ្ទាល់។',
    };
  }

  // 6. Border Camps / Infantry Task Forces vs Small Local / OSM Camps
  const isBorderTaskForce =
    text.includes('ព្រំដែន') ||
    text.includes('task force') ||
    text.includes('ភារកិច្ច') ||
    text.includes('វរសេនា') ||
    text.includes('infantry') ||
    text.includes('ranger') ||
    text.includes('ទាហានព្រាន');

  if (isBorderTaskForce) {
    return {
      density: 'medium',
      densityLabelKm: 'មធ្យម-ទាប (បន្ទាយប្រចាំការជួរមុខ)',
      densityShortKm: 'មធ្យម',
      estimatedScaleScore: 46,
      primaryCategoriesKm: ['កងល្បាតព្រំដែន និងថ្មើរជើង', 'យានយន្តពាសដែកស្រាល និងកាំភ្លើងត្បាល់'],
      documentedSystems: ['រថយន្តយោធាពាសដែកស្រាល', 'កាំភ្លើងត្បាល់ 81mm/120mm', 'អាវុធថ្មើរជើងស្តង់ដារ'],
      noteKm:
        'បន្ទាយប្រចាំការកម្រិតកងវរសេនាតូច/ភារកិច្ចតាមតំបន់ព្រំដែន មានអាវុធធុនស្រាលដល់មធ្យមសម្រាប់ល្បាត និងការពារមូលដ្ឋាន។',
    };
  }

  return {
    density: 'low',
    densityLabelKm: 'តិច (បន្ទាយមូលដ្ឋាន / មណ្ឌលយោធាខេត្ត)',
    densityShortKm: 'តិច',
    estimatedScaleScore: 28,
    primaryCategoriesKm: ['អង្គភាពរដ្ឋបាលយោធាខេត្ត', 'អាវុធធុនស្រាលការពារបន្ទាយ'],
    documentedSystems: ['អាវុធថ្មើរជើងធុនស្រាល', 'រថយន្តដឹកជញ្ជូនយោធាទូទៅ'],
    noteKm:
      'បន្ទាយខ្នាតតូច ឬមណ្ឌលយោធាប្រចាំខេត្ត ដែលភាគច្រើនគ្រប់គ្រងរដ្ឋបាល កម្លាំងបម្រុង និងការពារសន្តិសុខមូលដ្ឋាន។',
  };
}

