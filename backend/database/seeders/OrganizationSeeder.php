<?php
namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = [
            // පංක්තිය 1–36 (රූපය 2)
            ['organization_name' => 'ප්‍රාදේශීය ලේකම් කාර්යාලය, දකුණු පළාත',                                    'abbreviation' => 'PS-SP'],
            ['organization_name' => 'අභ්‍යන්තර වාහන දේපාර්තමේන්තුව',                                            'abbreviation' => 'TRD'],
            ['organization_name' => 'සහා ලේකම් කාර්යාලය',                                                         'abbreviation' => 'ASO'],
            ['organization_name' => 'පළාත් රාජ්‍ය සේවා කොමිෂන් සභාව',                                            'abbreviation' => 'PCSC'],
            ['organization_name' => 'නියෝජ්‍ය ප්‍රධාන ලේකම් (ඉංජිනේරු සේවා) කාර්යාලය',                         'abbreviation' => 'RPS-IS'],
            ['organization_name' => 'දිස්ත්‍රික් ඉංජිනේරු කාර්යාලය (ගොඩනැගිලි), ගාල්ල',                        'abbreviation' => 'DE-GAL'],
            ['organization_name' => 'දිස්ත්‍රික් ඉංජිනේරු කාර්යාලය (ගොඩනැගිලි), මාතර',                         'abbreviation' => 'DE-MAT'],
            ['organization_name' => 'දිස්ත්‍රික් ඉංජිනේරු කාර්යාලය (ගොඩනැගිලි), හම්බන්තොට',                    'abbreviation' => 'DE-HAM'],
            ['organization_name' => 'පළාත් ආදායම් දෙපාර්තමේන්තුව',                                               'abbreviation' => 'PRD'],
            ['organization_name' => 'පළාත් මෝටර් රථ කොමසාරිස් කාර්යාලය',                                         'abbreviation' => 'PMTCO'],
            ['organization_name' => 'නියෝජ්‍ය ප්‍රධාන ලේකම් (සේලසම් හා මෙහෙයුම්) කාර්යාලය',                   'abbreviation' => 'RPS-SW'],
            ['organization_name' => 'දකුණු පළාත් සෞඛ්‍ය අමාතාංශය',                                               'abbreviation' => 'SPH'],
            ['organization_name' => 'පළාත් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව',                                          'abbreviation' => 'PHSD'],
            ['organization_name' => 'ගාල්ල දිස්ත්‍රික් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව',                             'abbreviation' => 'GHSD'],
            ['organization_name' => 'මාතර දිස්ත්‍රික් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව',                              'abbreviation' => 'MHSD'],
            ['organization_name' => 'හම්බන්තොට දිස්ත්‍රික් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව',                        'abbreviation' => 'HHSD'],
            ['organization_name' => 'පළාත් මාර්ගස්ථ රථ පුවහන අධිකාරිය',                                          'abbreviation' => 'PRPA'],
            ['organization_name' => 'පළාත් සංවර්ධන අධිකාරිය',                                                     'abbreviation' => 'PDA'],
            ['organization_name' => 'රුහුණු සා-වාරක කාර්යාංශය',                                                   'abbreviation' => 'RIC'],
            ['organization_name' => 'පළාත් ආයුර්වේද දෙපාර්තමේන්තුව',                                             'abbreviation' => 'PAD'],
            ['organization_name' => 'පළාත් පාලන දෙපාර්තමේන්තුව',                                                  'abbreviation' => 'PED'],
            ['organization_name' => 'පළාත් පාලන සහකාර කොමසාරිස් කාර්යාලය, ගාල්ල',                               'abbreviation' => 'PEAC-GAL'],
            ['organization_name' => 'පළාත් පාලන සහකාර කොමසාරිස් කාර්යාලය, මාතර',                                'abbreviation' => 'PEAC-MAT'],
            ['organization_name' => 'පළාත් පාලන සහකාර කොමසාරිස් කාර්යාලය, හම්බන්තොට',                          'abbreviation' => 'PEAC-HAM'],
            ['organization_name' => 'පළාත් කෘෂිකර්ම අමාතාංශය',                                                    'abbreviation' => 'PAM'],
            ['organization_name' => 'දකුණු පළාත් කෘෂිකර්ම අමාතාංශය',                                             'abbreviation' => 'SPAM'],
            ['organization_name' => 'නියෝජ්‍ය කෘෂිකර්ම අධ්‍යක්ෂ කාර්යාලය, ගාල්ල',                              'abbreviation' => 'RAC-GAL'],
            ['organization_name' => 'නියෝජ්‍ය කෘෂිකර්ම අධ්‍යක්ෂ කාර්යාලය, මාතර',                               'abbreviation' => 'RAC-MAT'],
            ['organization_name' => 'නියෝජ්‍ය කෘෂිකර්ම අධ්‍යක්ෂ කාර්යාලය, හම්බන්තොට',                         'abbreviation' => 'RAC-HAM'],
            ['organization_name' => 'පළාත් වාරිමාර්ග දෙපාර්තමේන්තුව',                                            'abbreviation' => 'PHD'],
            ['organization_name' => 'දිස්ත්‍රික් වාරිමාර්ග ඉංජිනේරු කාර්යාල, ගාල්ල',                            'abbreviation' => 'GDHE'],
            ['organization_name' => 'දිස්ත්‍රික් වාරිමාර්ග ඉංජිනේරු කාර්යාල, මාතර',                             'abbreviation' => 'MDHE'],
            ['organization_name' => 'දිස්ත්‍රික් වාරිමාර්ග ඉංජිනේරු කාර්යාල, හම්බන්තොට',                       'abbreviation' => 'HDHE'],
            ['organization_name' => 'පළාත් සත්ව නිෂ්පාදන හා සෞඛ්‍ය දෙපාර්තමේන්තුව',                            'abbreviation' => 'PSSD'],
            ['organization_name' => 'පළාත් කර්මාන්ත සංවර්ධන දෙපාර්තමේන්තුව',                                    'abbreviation' => 'PIDD'],
            ['organization_name' => 'පළාත් කාර්මික සංවර්ධන අධිකාරිය',                                            'abbreviation' => 'PHRDA'],

            // පංක්තිය 37–49 (රූපය 1)
            ['organization_name' => 'සමූපකාර සංවර්ධන කොමසාරිස්',                                                  'abbreviation' => 'PCC'],
            ['organization_name' => 'සමූපකාර සේවා කොමසාරිස්',                                                     'abbreviation' => 'PAU'],
            ['organization_name' => 'කැබිනට් චිත්‍ර අමාතාංශය',                                                   'abbreviation' => 'CAM'],
            ['organization_name' => 'පළාත් අධ්‍යාපන සේකරාමිෂ සභාව',                                              'abbreviation' => 'PAS'],
            ['organization_name' => 'පළාත් සාමාන්‍යාධිකාරී',                                                      'abbreviation' => 'GAC'],
            ['organization_name' => 'සමෘද්ධි කොමිෂ සභාව',                                                         'abbreviation' => 'SC'],
            ['organization_name' => 'පළාත් ඉඩම් කොමසාරිස් කාර්යාලය',                                             'abbreviation' => 'PCO'],
            ['organization_name' => 'දකුණු සුහසායාය හා පරිතාමේන්කුව',                                             'abbreviation' => 'PYB'],
            ['organization_name' => 'සාමය කොමසාරිස් නිවාස කාර්යාලය',                                             'abbreviation' => 'SSSD'],
            ['organization_name' => 'දිස්ත්‍රික් නිවාස කොමසාරිස්',                                                'abbreviation' => 'PHCO'],
            ['organization_name' => 'දිස්ත්‍රික් ලේකම් කාර්යාලය, ගාල්ල',                                         'abbreviation' => 'DS-GAL'],
            ['organization_name' => 'දිස්ත්‍රික් ලේකම් කාර්යාලය, මාතර',                                          'abbreviation' => 'DS-MAT'],
            ['organization_name' => 'දිස්ත්‍රික් ලේකම් කාර්යාලය, හම්බන්තොට',                                    'abbreviation' => 'DS-HAM'],
        ];

        foreach ($organizations as $org) {
            Organization::updateOrCreate(
                ['organization_name' => $org['organization_name']],
                $org
            );
        }
    }
}
