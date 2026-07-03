<?php
namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── අභ්‍යන්තර නිලධාරීන් ─────────────────────────────────────
        // දකුණු පළාත් ප්‍රධාන ලේකම් කාර්යාලය - සංවර්ධන අංශය
        // organization_id = NULL (අභ්‍යන්තර කාර්ය මණ්ඩලය)
        // ─────────────────────────────────────────────────────────────
        $internalUsers = [
            [
                'full_name'   => 'ඩබ්. එම්. බණ්ඩාර',
                'email'       => 'admin@spc.gov.lk',
                'username'    => 'w.bandara',
                'role_name'   => 'admin',
                'designation' => null,
            ],
            [
                'full_name'   => 'පී. ගුණවර්ධන',
                'email'       => 'officer@spc.gov.lk',
                'username'    => 'p.gunawardena',
                'role_name'   => 'officer',
                'designation' => null,
            ],
            [
                'full_name'   => 'එස්. රණසිංහ',
                'email'       => 'officer2@spc.gov.lk',
                'username'    => 's.ranasinghe',
                'role_name'   => 'officer',
                'designation' => null,
            ],
            [
                'full_name'   => 'ඩී. ලියනගේ',
                'email'       => 'depthead@spc.gov.lk',
                'username'    => 'd.liyanage',
                'role_name'   => 'dept_head',
                'designation' => null,
            ],
            [
                'full_name'   => 'කේ. සේනානායක',
                'email'       => 'deputy@spc.gov.lk',
                'username'    => 'k.senanayake',
                'role_name'   => 'deputy',
                'designation' => null,
            ],
            [
                'full_name'   => 'එච්. එම්. ජයවර්ධන',
                'email'       => 'chiefsec@spc.gov.lk',
                'username'    => 'h.jayawardena',
                'role_name'   => 'chief_secretary',
                'designation' => null,
            ],
        ];

        foreach ($internalUsers as $u) {
            $role = Role::where('role_name', $u['role_name'])->first();

            if (!$role) {
                $this->command->warn("Role '{$u['role_name']}' හමු නොවීය. RoleSeeder පළමුව ධාවනය කරන්න.");
                continue;
            }

            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'full_name'       => $u['full_name'],
                    'username'        => $u['username'],
                    'password_hash'   => Hash::make('password'),
                    'role_id'         => $role->role_id,
                    'organization_id' => null,
                    'designation'     => $u['designation'],
                    'status'          => 'ACTIVE',
                ]
            );
        }

        // ── බාහිර නිලධාරීන් ─────────────────────────────────────────
        // ඔබගේ ලැයිස්තුවේ ආයතනවල සිංහල නම් සහ නිශ්චිත තනතුරු
        // ─────────────────────────────────────────────────────────────
        $externalRole = Role::where('role_name', 'external_officer')->first();

        if (!$externalRole) {
            $this->command->warn('external_officer භූමිකාව හමු නොවීය. RoleSeeder පළමුව ධාවනය කරන්න.');
            return;
        }

        $externalUsers = [
            [
                'full_name'   => 'ආර්. ඒ. දිසානායක',
                'email'       => 'r.dissanayake@ps.sp.gov.lk',
                'username'    => 'r.dissanayake.ps',
                'designation' => 'ප්‍රාදේශීය ලේකම්',
                'org'         => 'PS-SP',
            ],
            [
                'full_name'   => 'එන්. කේ. විජේසිංහ',
                'email'       => 'n.wijesinghe@trd.sp.gov.lk',
                'username'    => 'n.wijesinghe.trd',
                'designation' => 'අභ්‍යන්තර වාහන කොමිෂනර්',
                'org'         => 'TRD',
            ],
            [
                'full_name'   => 'පී. එල්. හේරත්',
                'email'       => 'p.herath@de.gal.sp.gov.lk',
                'username'    => 'p.herath.de.gal',
                'designation' => 'දිස්ත්‍රික් ඉංජිනේරු',
                'org'         => 'DE-GAL',
            ],
            [
                'full_name'   => 'එස්. බී. ජයසේන',
                'email'       => 's.jayasena@de.mat.sp.gov.lk',
                'username'    => 's.jayasena.de.mat',
                'designation' => 'දිස්ත්‍රික් ඉංජිනේරු',
                'org'         => 'DE-MAT',
            ],
            [
                'full_name'   => 'ඒ. ආර්. කුමාර',
                'email'       => 'a.kumara@de.ham.sp.gov.lk',
                'username'    => 'a.kumara.de.ham',
                'designation' => 'දිස්ත්‍රික් ඉංජිනේරු',
                'org'         => 'DE-HAM',
            ],
            [
                'full_name'   => 'ටී. එම්. පෙරේරා',
                'email'       => 't.perera@prd.sp.gov.lk',
                'username'    => 't.perera.prd',
                'designation' => 'පළාත් ආදායම් කොමිෂනර්',
                'org'         => 'PRD',
            ],
            [
                'full_name'   => 'සී. ඩී. ප්‍රනාන්දු',
                'email'       => 'c.fernando@phsd.sp.gov.lk',
                'username'    => 'c.fernando.phsd',
                'designation' => 'පළාත් සෞඛ්‍ය කොමිෂනර්',
                'org'         => 'PHSD',
            ],
            [
                'full_name'   => 'එම්. එස්. රත්නවීර',
                'email'       => 'm.rathnaweera@ghsd.sp.gov.lk',
                'username'    => 'm.rathnaweera.ghsd',
                'designation' => 'දිස්ත්‍රික් සෞඛ්‍ය සේවා අධ්‍යක්ෂ',
                'org'         => 'GHSD',
            ],
            [
                'full_name'   => 'කේ. බී. ජයකොඩි',
                'email'       => 'k.jayakody@mhsd.sp.gov.lk',
                'username'    => 'k.jayakody.mhsd',
                'designation' => 'දිස්ත්‍රික් සෞඛ්‍ය සේවා අධ්‍යක්ෂ',
                'org'         => 'MHSD',
            ],
            [
                'full_name'   => 'එල්. පී. ගුණතිලක',
                'email'       => 'l.gunathilaka@hhsd.sp.gov.lk',
                'username'    => 'l.gunathilaka.hhsd',
                'designation' => 'දිස්ත්‍රික් සෞඛ්‍ය සේවා අධ්‍යක්ෂ',
                'org'         => 'HHSD',
            ],
            [
                'full_name'   => 'වී. ආර්. සේනාවිරත්න',
                'email'       => 'v.seneviratne@ped.sp.gov.lk',
                'username'    => 'v.seneviratne.ped',
                'designation' => 'පළාත් අධ්‍යාපන කොමිෂනර්',
                'org'         => 'PED',
            ],
            [
                'full_name'   => 'බී. ජී. මාරසිංහ',
                'email'       => 'b.marasinghe@peac.gal.sp.gov.lk',
                'username'    => 'b.marasinghe.peac.gal',
                'designation' => 'පළාත් පාලන සහකාර කොමිෂනර්',
                'org'         => 'PEAC-GAL',
            ],
            [
                'full_name'   => 'එච්. එන්. රත්නසිරි',
                'email'       => 'h.rathnasiri@peac.mat.sp.gov.lk',
                'username'    => 'h.rathnasiri.peac.mat',
                'designation' => 'පළාත් පාලන සහකාර කොමිෂනර්',
                'org'         => 'PEAC-MAT',
            ],
            [
                'full_name'   => 'යූ. කේ. තෙන්නකෝන්',
                'email'       => 'u.tennakoon@peac.ham.sp.gov.lk',
                'username'    => 'u.tennakoon.peac.ham',
                'designation' => 'පළාත් පාලන සහකාර කොමිෂනර්',
                'org'         => 'PEAC-HAM',
            ],
            [
                'full_name'   => 'ඩී. එම්. බණ්ඩාර',
                'email'       => 'd.bandara@phd.sp.gov.lk',
                'username'    => 'd.bandara.phd',
                'designation' => 'පළාත් වාරිමාර්ග අධ්‍යක්ෂ',
                'org'         => 'PHD',
            ],
            [
                'full_name'   => 'ආර්. සී. වික්‍රමසිංහ',
                'email'       => 'r.wickramasinghe@gdhe.sp.gov.lk',
                'username'    => 'r.wickramasinghe.gdhe',
                'designation' => 'දිස්ත්‍රික් වාරිමාර්ග ඉංජිනේරු',
                'org'         => 'GDHE',
            ],
            [
                'full_name'   => 'ජේ. පී. අමරසිංහ',
                'email'       => 'j.amarasinghe@mdhe.sp.gov.lk',
                'username'    => 'j.amarasinghe.mdhe',
                'designation' => 'දිස්ත්‍රික් වාරිමාර්ග ඉංජිනේරු',
                'org'         => 'MDHE',
            ],
            [
                'full_name'   => 'එන්. එම්. ඒකනායක',
                'email'       => 'n.ekanayake@hdhe.sp.gov.lk',
                'username'    => 'n.ekanayake.hdhe',
                'designation' => 'දිස්ත්‍රික් වාරිමාර්ග ඉංජිනේරු',
                'org'         => 'HDHE',
            ],
            [
                'full_name'   => 'ජී. එල්. ෆොන්සේකා',
                'email'       => 'g.fonseka@pam.sp.gov.lk',
                'username'    => 'g.fonseka.pam',
                'designation' => 'පළාත් කෘෂිකර්ම කොමිෂනර්',
                'org'         => 'PAM',
            ],
            [
                'full_name'   => 'ඩබ්. ඩී. රාජපක්ෂ',
                'email'       => 'w.rajapaksha@rac.gal.sp.gov.lk',
                'username'    => 'w.rajapaksha.rac.gal',
                'designation' => 'නියෝජ්‍ය කෘෂිකර්ම අධ්‍යක්ෂ',
                'org'         => 'RAC-GAL',
            ],
            [
                'full_name'   => 'එස්. ටී. කළුපේරුම',
                'email'       => 's.kaluperuma@rac.mat.sp.gov.lk',
                'username'    => 's.kaluperuma.rac.mat',
                'designation' => 'නියෝජ්‍ය කෘෂිකර්ම අධ්‍යක්ෂ',
                'org'         => 'RAC-MAT',
            ],
            [
                'full_name'   => 'පී. එන්. වීරසේකර',
                'email'       => 'p.weerasekara@rac.ham.sp.gov.lk',
                'username'    => 'p.weerasekara.rac.ham',
                'designation' => 'නියෝජ්‍ය කෘෂිකර්ම අධ්‍යක්ෂ',
                'org'         => 'RAC-HAM',
            ],
            [
                'full_name'   => 'එම්. කේ. සමරකෝන්',
                'email'       => 'm.samarakoon@pda.sp.gov.lk',
                'username'    => 'm.samarakoon.pda',
                'designation' => 'අධ්‍යක්ෂ ජනරාල්',
                'org'         => 'PDA',
            ],
            [
                'full_name'   => 'ඒ. එල්. පතිරණ',
                'email'       => 'a.pathirana@pidd.sp.gov.lk',
                'username'    => 'a.pathirana.pidd',
                'designation' => 'පළාත් කර්මාන්ත කොමිෂනර්',
                'org'         => 'PIDD',
            ],
            [
                'full_name'   => 'ටී. බී. සිරිවර්ධන',
                'email'       => 't.siriwardena@pcc.sp.gov.lk',
                'username'    => 't.siriwardena.pcc',
                'designation' => 'සමූපකාර කොමිෂනර්',
                'org'         => 'PCC',
            ],
            [
                'full_name'   => 'සී. පී. විමලසේන',
                'email'       => 'c.wimalasena@ds.gal.gov.lk',
                'username'    => 'c.wimalasena.ds.gal',
                'designation' => 'දිස්ත්‍රික් ලේකම්',
                'org'         => 'DS-GAL',
            ],
            [
                'full_name'   => 'ආර්. ජී. කෝදිකාර',
                'email'       => 'r.kodikara@ds.mat.gov.lk',
                'username'    => 'r.kodikara.ds.mat',
                'designation' => 'දිස්ත්‍රික් ලේකම්',
                'org'         => 'DS-MAT',
            ],
            [
                'full_name'   => 'බී. එච්. නානායක්කාර',
                'email'       => 'b.nanayakkara@ds.ham.gov.lk',
                'username'    => 'b.nanayakkara.ds.ham',
                'designation' => 'දිස්ත්‍රික් ලේකම්',
                'org'         => 'DS-HAM',
            ],
        ];

        foreach ($externalUsers as $u) {
            $org = Organization::where('abbreviation', $u['org'])->first();

            if (!$org) {
                $this->command->warn("ආයතනය '{$u['org']}' හමු නොවීය. OrganizationSeeder පළමුව ධාවනය කරන්න.");
                continue;
            }

            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'full_name'       => $u['full_name'],
                    'username'        => $u['username'],
                    'password_hash'   => Hash::make('password'),
                    'role_id'         => $externalRole->role_id,
                    'organization_id' => $org->organization_id,
                    'designation'     => $u['designation'],
                    'status'          => 'ACTIVE',
                ]
            );
        }
    }
}

?>