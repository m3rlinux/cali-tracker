# Firebase — setup Cali Tracker

L’app su GitHub Pages resta statica. Auth e sessioni stanno su Firebase (piano Spark).

## 1. Progetto

1. [Firebase console](https://console.firebase.google.com/) → Add project.
2. Authentication → Sign-in method: abilita **Google** e **Email/Password**.
3. Authentication → Settings → Authorized domains: `m3rlinux.github.io` e `localhost`.
4. Firestore Database → Create, regione **eur3** (o `europe-west1`).
5. Firestore → Rules: copia il contenuto di `firestore.rules`.
6. Project settings → Your apps → Web app: copia apiKey, authDomain, projectId, ecc. in `firebase-config.js`.

## 2. Admin

In **entrambi**:

- `firebase-config.js` → `adminEmails`
- `firestore.rules` → `isAdmin()` email list

usa la stessa email Google/login con cui approvi gli allievi. Pubblica di nuovo le rules.

Il primo accesso con un'email in `adminEmails` crea il profilo già **approved** (le rules lo permettono solo se il token ha quella email). Gli altri restano `pending` finché un admin non li approva dalla tab **Admin**.

Dalla tab Admin si assegna anche il ruolo **istruttore** (`role: instructor`): solo istruttori e admin vedono la modalità Classe. I nuovi profili nascono `role: athlete`; l’owner non può cambiare `role` (solo l’admin). Dopo aver modificato `firestore.rules`, pubblicarle di nuovo.

Se l'email admin non coincide ancora tra config e rules, il profilo nasce `pending`: in Firestore imposta `status: approved`, oppure usa un altro account già admin.

## 3. Deploy

`firebase-config.js` è copiato su Pages dal workflow. Dopo il push, l’app chiede login: senza config compilata mostra “Firebase non configurato”.
