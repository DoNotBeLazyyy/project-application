export function getRoleFromPath(pathname: string): string {
    const seg = pathname.split('/')[1]?.toLowerCase();
    if (seg === 'dean') return 'Dean';
    if (seg === 'registrar') return 'Registrar';
    if (seg === 'faculty') return 'Faculty';
    if (seg === 'student') return 'Student';
    return 'Admin';
}
