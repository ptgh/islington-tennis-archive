export function accountDestination(signedIn: boolean): 'profile' | 'signup' {
  return signedIn ? 'profile' : 'signup';
}