import { clientService } from './services/mockSupabase';

async function verifyIsabel() {
    console.log('Fetching clients...');
    const clients = await clientService.getClients();

    const isabel = clients.find(c => c.name.toLowerCase().includes('isabel calvo'));

    if (isabel) {
        console.log('Isabel Calvo found:');
        console.log('- ID:', isabel.id);
        console.log('- Nutrition Approved:', isabel.nutrition_approved);
        console.log('- Assigned Type:', isabel.nutrition?.assigned_nutrition_type);
        console.log('- Assigned Calories:', isabel.nutrition?.assigned_calories);
        console.log('- Nutrition Plan ID:', isabel.nutrition_plan_id);

        if (isabel.nutrition_plan_id) {
            console.log('SUCCESS: Nutrition Plan ID successfully mapped!');
        } else {
            console.log('FAILURE: Nutrition Plan ID is still missing.');
        }
    } else {
        console.log('Isabel Calvo not found in client list.');
    }
}

verifyIsabel();
