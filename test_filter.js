
const clientCoach = "Jesús".toLowerCase().trim();
const currentCoachName = "Jesús Martínez".toLowerCase().trim();
const currentCoachEmail = "jesusmartinezpadron@gmail.com".toLowerCase().trim();

const match1 = clientCoach === currentCoachName;
const match2 = clientCoach === currentCoachEmail;
const match3 = clientCoach.includes(currentCoachName);
const match4 = currentCoachName.includes(clientCoach);
const match5 = clientCoach.includes(currentCoachEmail.split('@')[0]);

console.log({
    clientCoach,
    currentCoachName,
    match1,
    match2,
    match3,
    match4,
    match5,
    any: match1 || match2 || match3 || match4 || match5
});
