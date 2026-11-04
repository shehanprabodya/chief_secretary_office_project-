@php
    $isSinhala = $locale === 'si';
    $roleName = $user->role?->role_name ?? '-';
    $organizationName = $user->organization?->organization_name ?? '-';
@endphp

<!DOCTYPE html>
<html lang="{{ $locale }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $isSinhala ? 'SPMMS ගිණුම් ආරාධනය' : 'SPMMS Account Invitation' }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <h2>{{ $isSinhala ? 'SPMMS වෙත සාදරයෙන් පිළිගනිමු' : 'Welcome to SPMMS' }}</h2>

    <p>
        {{ $isSinhala ? 'ඔබගේ ගිණුම පද්ධතිය තුළ නිර්මාණය කර ඇත.' : 'Your account has been created in the system.' }}
    </p>

    <ul>
        <li><strong>{{ $isSinhala ? 'පරිශීලක නාමය' : 'Username' }}:</strong> {{ $user->username }}</li>
        <li><strong>{{ $isSinhala ? 'සම්පූර්ණ නම' : 'Full name' }}:</strong> {{ $user->full_name }}</li>
        <li><strong>{{ $isSinhala ? 'භූමිකාව' : 'Role' }}:</strong> {{ $roleName }}</li>
        <li><strong>{{ $isSinhala ? 'ආයතනය' : 'Organization' }}:</strong> {{ $organizationName }}</li>
    </ul>

    <p>
        {{ $isSinhala ? 'ඔබගේ මුරපදය සකස් කිරීමට පහත ආරක්ෂිත සබැඳිය භාවිතා කරන්න:' : 'Use the secure link below to set your password:' }}
    </p>

    <p>
        <a href="{{ $acceptUrl }}">{{ $isSinhala ? 'මුරපදය සකසන්න' : 'Set Password' }}</a>
    </p>

    <p>
        {{ $isSinhala ? 'මෙම සබැඳිය වලංගු වන්නේ:' : 'This invitation expires at:' }}
        <strong>{{ $invitation->expires_at->toDateTimeString() }}</strong>
    </p>

    <p>
        {{ $isSinhala ? 'ඔබ මෙම ඉල්ලීම නොකළේ නම්, මෙම විද්‍යුත් තැපෑල නොසලකා හරින්න.' : 'If you did not expect this invitation, please ignore this email.' }}
    </p>
</body>
</html>
