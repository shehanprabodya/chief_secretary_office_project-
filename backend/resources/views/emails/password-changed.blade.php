@php
    $isSinhala = $locale === 'si';
@endphp

<!DOCTYPE html>
<html lang="{{ $locale }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $isSinhala ? 'මුරපදය වෙනස් කළ බව තහවුරු කිරීම' : 'Password Change Confirmation' }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <h2>{{ $isSinhala ? 'මුරපදය යාවත්කාලීන කරන ලදී' : 'Your Password Was Updated' }}</h2>

    <p>
        {{ $isSinhala
            ? 'ඔබගේ SPMMS ගිණුම සඳහා මුරපදය වෙනස් කර ඇත.'
            : 'The password for your SPMMS account has been changed.' }}
    </p>

    <p>
        {{ $isSinhala
            ? 'මෙම ක්‍රියාව ඔබ නොකළේ නම්, කරුණාකර පද්ධති පරිපාලකවරයා අමතන්න.'
            : 'If you did not perform this action, contact your system administrator immediately.' }}
    </p>

    <p>
        {{ $isSinhala ? 'වේලාව:' : 'Time:' }} <strong>{{ now()->toDateTimeString() }}</strong>
    </p>
</body>
</html>
