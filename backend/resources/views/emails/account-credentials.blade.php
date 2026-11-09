<!doctype html><html lang="{{ $isSinhala ? 'si' : 'en' }}"><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.55">
@if($isSinhala)
<p>හිතවත් {{ $user->displayNameSinhala() }},</p><p>SPMMS ගිණුම සාර්ථකව සාදන ලදී. පහත තාවකාලික පිවිසුම් තොරතුරු භාවිතයෙන් පිවිසෙන්න.</p>
<p><strong>පරිශීලක නාමය:</strong> {{ $user->username }}<br><strong>විද්‍යුත් තැපෑල:</strong> {{ $user->email }}<br><strong>තාවකාලික මුරපදය:</strong> {{ $temporaryPassword }}</p>
<p><a href="{{ $loginUrl }}">SPMMS වෙත පිවිසෙන්න</a></p><p>පළමු පිවිසුමේදීම ඔබේ මුරපදය වෙනස් කළ යුතුය. ඔබගේ පිවිසුම් තොරතුරු කිසිවෙකු සමඟ බෙදා නොගන්න.</p>
@else
<p>Dear {{ $user->full_name }},</p><p>Your SPMMS account has been created. Use these temporary credentials to sign in.</p>
<p><strong>Username:</strong> {{ $user->username }}<br><strong>Email:</strong> {{ $user->email }}<br><strong>Temporary password:</strong> {{ $temporaryPassword }}</p>
<p><a href="{{ $loginUrl }}">Sign in to SPMMS</a></p><p>You must change this password immediately after your first sign-in. Do not share your login credentials with anyone.</p>
@endif
<p>Office of the Chief Secretary<br>Southern Provincial Council</p></body></html>
