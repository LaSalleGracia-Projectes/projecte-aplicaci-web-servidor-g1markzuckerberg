# DAW-M07-UF4-PR01_INITIAL_CODE
Repositori del codi inicial de la pràctica 1 del M06-UF3 (ReactJS) i del M07-UF4 (NodeJS + MongoDB)

# **Instruccions**
- Si el professor ho considera necessari serà obligatori superar una entrevista o presentació de la pràctica mostrant el correcte funcionament de l'aplicació per poder obtenir una nota.
- L'entrega es realitzarà utilitzant 2 plataformes: Sallenet i Github. És obligatoria l'entrega dins del termini a les dues per poder obtenir una nota.
- La pràctica està pensada per fer-la en parelles, ara bé si algú prefereix anar sol també pot fer-ho.
- La pràctica és realitza conjuntament entre les UFs M06-UF3 i M07-UF4.
  - Aquest és el repositori del codi de la pràctica de M07-UF4.

# **Entrega**
Cal entregar el codi a Sallenet i al repositori.
Cal entregar també una memòria de cada apartat BACKEND (M07-UF4) i FRONTEND (M06-UF3).
- BACKEND: Entrega un pdf amb una captura per cada endpoint en l'ordre que surt a l'enunciat.
- FRONTEND: Entrega un video mostrant sempre la consola i seguint els següents passos:
  1. Anar a la vista "/search" i veure com es redirecciona automàticament al login
  2. Anar a la vista "/" i veure com es redirecciona automàticament al login
  3. Registre
  4. Login amb password incorrecte
  5. Login amb password correcte
  6. Mostrar el sessionStorage
  7. Buscar un país
  8. Buscar una ciutat del país
  9. Afegir la ciutat a les meves ciutat
  10. Buscar un altre país
  11. Buscar una altra ciutat
  12. Afegir la ciutat a les meves ciutats
  13. Logout
  14. Login
  15. Veure les meves ciutats amb el temps
  16. Borrar una ciutat de les meves ciutats
  
**La no entrega d'alguna de les parts es considerarà una pràctica no vàlida**

# **Objectiu**
El propòsit d'aquesta pràctica és que desenvolupeu una aplicació web amb React que permeti als usuaris buscar i guardar ciutats, i mostrar-ne informació meteorològica actual utilitzant l'API de WeatherAPI.com. A més, heu de crear una API amb Node.js i MongoDB per gestionar la informació de països i ciutats, implementant autenticació i autorització amb JSON Web Tokens (JWT), un sistema de tokens de refrescament i una interfície web per gestionar la base de dades.

# **Enunciat**
## **BACKEND**
Caldrà crear una API utilitzant NodeJS i MongoDB. Aquesta API ha de tenir els endpoints següents:
- Registre:
  - URL: 'api/v1/auth/signup'
  - Paràmetres a validar:
    - email: validar format de email.
    - password: validar que sigui un conjunt de lletres i números amb mínim una majúscula i una minúscula, i entre 6 i 15 caràcters.
    - password_confirm: validar que sigui igual que el password.
  - Accions:
    - Si les dades són correctes es guardarà l'usuari a la BBDD amb només el seu email i password encriptat.
- Login:
  - URL: 'api/v1/auth/login'
  - Paràmetres a validar:
    - email: validar format de email.
    - password: validar que sigui un conjunt de lletres i números amb mínim una majúscula i una minúscula, i entre 6 i 15 caràcters.
  - Accions:
    - Si les dades són correctes s'enviarà un token creat amb JWT, el token ha de tenir una caducitat de 15min, i un token de refresc que caducarà en 1 dia.
- Obtenir nou token amb el token de refresh:
  - URL: 'api/v1/refresh-token'
  - Accions:
    - Es validarà que es rebi un token correcte (serà el token de refresc) per la capçalera de la petició.
    - Si es rep un token de refresc correcte caldrà retornar un nou token d'autenticació amb caducitat 15min.
    - Si no es rep un token de refresc correcte es retornarà un missatge corresponent d'error.
- Obtenir tots els països:
  - URL: 'api/v1/countries'
  - Accions:
    - Validar amb un middleware que s'envia un token d'autenticació correcte.
    - Retornarà tota la informació dels països ordenats alfabèticament pel nom dels països.
- Obtenir ciutats:
  - URL: 'api/v1/cities'
  - Paràmetres a validar:
    - name: validar que sigui un string amb lletres només.
  - Accions:
    - Validar amb un middleware que s'envia un token d'autenticació correcte.
    - Retornarà tota la informació de les ciutats ordenades alfabèticament pel nom de les ciutats, però només d'aquelles que el seu nom comenci pel paràmetre rebut.
- Afegir a les meves ciutats:
  - URL: 'api/v1/my-cities'
  - Paràmetres a validar:
    - id: validar que sigui un oid de MongoDB.
  - Accions:
    - Validar amb un middleware que s'envia un token d'autenticació correcte.
    - Si es troba una ciutat amb aquesta id rebuda per paràmetre, caldrà guardar la id dins del document de la BBDD de l'usuari (no s'ha de crear una col·lecció a part).
- Obtenir les meves ciutats:
  - URL: 'api/v1/my-cities'
  - Accions:
    - Validar amb un middleware que s'envia un token d'autenticació correcte.
    - Retornarà tota la informació de les ciutats (i dels seus països) que s'hagi guardat l'usuari, ordenades alfabèticament pel nom de les ciutats.

A part de l'API, el servidor tindrà una interficie web feta amb EJS per poder tenir un panell d'administració per gestionar les ciutats de la BBDD. Sempre que hi hagi un error es mostrarà un missatge dins d'un tag &lt;p&gt; amb **id "*error-msg*"** i la paraula "ERROR" seguida del missatge corresponent. Les vistes que tindrà són les següents:
- Llistar ciutats:
  - URL: 'cities'
  - Accions:
    - Caldrà mostrar una taula amb tota la informació de totes les ciutats i els seus països, ordenats alfabèticament pel nom de les ciutats.
    - Per cada fila de la taula, el tag &lt;tr&gt; tindrà un atribut anomenat **"*data-city-id*" + id de la ciutat**.
    - Per cada fila de la taula hi haurà un botó per editar la ciutat amb la **classe "*edit-city*"** i un altre per eliminar-la amb la **classe "*remove-city*"**.
    - Fora de la taula també hi haurà un botó per crear una nova ciutat amb la **id "*create-city*"**.
- Mostrar el formulari de creació de ciutats:
  - URL: 'cities/create'
  - Accions:
    - Mostrar el formulari de creació de ciutats.
- Crear ciutats:
  - URL: 'cities'
  - Paràmetres a validar:
    - name: validar que sigui un conjunt de lletres i la primera sigui majúscula.
    - country: validar que sigui un conjunt de lletres i la primera sigui majúscula.
  - Accions:
    - Es comprovarà si existia el país a la BBDD:
      - Si existeix es guardarà la ciutat i es vincularà amb la id del país.
      - Si no existeix es guardarà el país i també es guardarà la ciutat vinculant-la amb la id del país acabat de crear.
    - En qualsevol cas es retornarà a la vista de "Llistar ciutats".
- Mostrar el formulari d'edició de ciutats:
  - URL: 'cities/edit'
  - Paràmetres a validar:
    - id: validar que sigui un oid de MongoDB.
  - Accions:
    - Mostrar el formulari d'edició de ciutats.
- Editar ciutats:
  - URL: 'cities'
  - Paràmetres a validar:
    - id: validar que sigui un oid de MongoDB.
    - name: validar que sigui un conjunt de lletres i la primera sigui majúscula, i que sigui opcional.
    - country: validar que sigui un conjunt de lletres i la primera sigui majúscula, i que sigui opcional.
  - Accions:
    - Es comprovarà si existia el país a la BBDD:
      - Si existeix s'actualitzarà les dades de la ciutat i es vincularà amb la id del país.
      - Si no existeix es guardarà el país i també s'actualitzarà la ciutat vinculant-la amb la id del país acabat de crear.
    - En qualsevol cas es retornarà a la vista de "Llistar ciutats".
- Eliminar ciutats:
  - URL: 'cities'
  - Paràmetres a validar:
    - id: validar que sigui un oid de MongoDB.
  - Accions:
    - S'eliminarà la ciutat que s'envii per paràmetre, però abans es comprovarà quin és el seu país i si no queda cap altre ciutat en aquest país, també s'eliminarà el país de la BBDD.
    - En qualsevol cas es retornarà a la vista de "Llistar ciutats".

## **FRONTEND**
Cal crear una aplicació feta amb React que es connecti a l'API anteriorment explicada per gestionar les ciutats guardades de l'usuari, i amb l'API de WeatherAPI.com per mostrar les icones del temps actual a les ciutats.

Les vistes seran les següents:
- Login:
  - URL: '/login'
  - Accions:
    - Tindrem el formulari de login que farà servir la nostra API per obtenir els tokens i guardar-los al sessionStorage.
    - Si hi ha algun error caldrà mostrar un missatge dins d'una &lt;p&gt; amb **id "*error-msg*"**.
    - Si es realitza el login correctament cal redireccionar a la vista de mostrar el buscador de ciutats.
    - Hi ha d'haver un enllaç amb un tag &lt;a&gt; amb **id "*goto-signup*"** per anar a la vista de registre.
- Registre:
  - URL: '/signup'
  - Accions:
    - Tindrem el formulari de registre que farà servir la nostra API per crear un usuari nou.
    - Si hi ha algun error caldrà mostrar un missatge dins d'una &lt;p&gt; amb **id "*error-msg*"**.
    - Si es realitza el registre correctament cal redireccionar a la vista de login.
    - Hi ha d'haver un enllaç amb un tag &lt;a&gt; amb **id "*goto-login*"** per anar a la vista de registre.
- Buscador de països:
  - URL: '/search'
  - Accions:
    - Si l'usuari no està loguejat, cal redireccionar a la vista de login.
    - Si l'usuari està loguejat cal que es mostri i funcioni el següent:
      - Un botó amb la **id "*logout*"** per tancar la sessió.
      - Un formulari amb un sol camp de text que serveixi per buscar un país:
        - Un input amb **id "*name-country*"**
        - El formulari ha de tenir la **id "*country-search*"**
      - Cal mostrar una llista de tots els països, ha d'estar en una &lt;ul&gt; amb **id "country-list*"**. I cada país ha d'estar en un tag &lt;li&gt;.
      - Cada cop que es cliqui una tecla dins del input (és a dir, a cada lletra que escrigui) caldrà filtrar la llista anterior i mostrar només els països que comencen pel text introduit.
      - Quan es cliqui al tag &lt;li&gt; d'un país, caldrà mostrar un component amb el buscador de ciutats.
  - COMPONENT - Buscador de ciutats:
    - No té URL ha d'estar dins del component del buscador de països.
    - Accions:
      - Cal que es mostri i funcioni el següent:
        - Un formulari amb un sol camp de text que serveixi per buscar una ciutat:
          - Un input amb **id "*name-city*"**
          - El formulari ha de tenir la **id "*city-search*"**
        - Cal que hi hagi, una &lt;ul&gt; amb **id "city-list*"**.
        - Cada cop que es cliqui una tecla dins del input (és a dir, a cada lletra que escrigui) s'esperarà 2 segons i llavors farà una petició a la nostra API per obtenir la llista de ciutats que comencen pel text introduit. Aquesta llista s'ha de mostrar a la &lt;ul&gt; anterior i cada ciutat ha d'estar dins d'un tag &lt;li&gt;.
        - Dins del &lt;li&gt; de la ciutat hi haurà 2 botons:
          - Un botó amb **id "*btn-add-mycities", que servirà per afegir la ciutat a la llista de les meves ciutats guardades a la BBDD. El botó ha d'estar desactivat (disabled) si la ciutat ja està afegida.
          - Un botó amb **id "*btn-remove-mycities", que servirà per eliminar la ciutat de la llista de les meves ciutats guardades a la BBDD. El botó ha d'estar desactivat (disabled) si la ciutat ja està afegida.
- Llista de les meves ciutats:
  - URL: '/'
  - Accions:
    - Si l'usuari no està loguejat, cal redireccionar a la vista de login.
    - Si l'usuari està loguejat cal que es mostri i funcioni el següent:
      - Un botó amb la **id "*logout*"** per tancar la sessió.
      - Hi haurà una llista de les meves ciutats guardades a la BBDD, dins d'un tag &lt;ul&gt; amb la **id "*mycity-list*"**. I cada ciutat estarà dins d'un tag &lt;li&gt;.
      - De cada ciutat s'ha de veure tota la seva informació, amb el nom del país, i un icona on es vegi el temps actual de la ciutat.
        - L'icona el treurem de l'API de WeatherAPI.com
      - Dins d'una ciutat hi haurà un botó **id "*btn-remove-mycities*"**, que servirà per eliminar la ciutat de la llista de les meves ciutats guardades a la BBDD.

  Si l'usuari està loguejat, en tot moment ha de tenir una barra de navegació per poder anar entre la vista '/' i la vista '/search'.

# **Puntuació**
Cada pràctica es puntuarà per separat.
M07-UF4:
- (0,5p) API-Registre
- (0,5p) API-Login
- (1p) API-Token de refresh
- (0,5p) API-Llistar països
- (0,5p) API-Llistar ciutats
- (1p) API-Afegir les meves ciutats
- (1p) API-Llistar les meves ciutats
- (0,5p) WEB-Llistar ciutats
- (0,5p) WEB-Mostrar form creació i Crear ciutats
- (0,5p) WEB-Mostrar form d'edició i Editar ciutats
- (0,5p) WEB-Eliminar ciutats
- (1p) *Qualitat de codi
- (1p) *Ús correcte de Github
- (1p) *Hosting
  - *Aquests 3 últims punts no s'obtindran si no s'aprova la pràctica amb la resta de la puntuació

M06-UF3 (cal fer un bon ús dels hooks de React sempre que es pugui):
- (0,5p) Login/Logout
- (0,5p) Registre
- (2p) Buscador de països
- (2p) Buscador de ciutats
- (2p) Llistar les meves ciutats
- (1p) *Qualitat de codi
- (1p) *Ús correcte de Github
- (1p) *Hosting
  - *Aquests 3 últims punts no s'obtindran si no s'aprova la pràctica amb la resta de la puntuació