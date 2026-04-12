import * as dotenv from 'dotenv';
import * as path from 'path';

// Load variables from .env.develop as the default
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') });

const JIRA_URL = process.env.JIRA_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

async function fetchJiraTicket(ticketId: string) {
  if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('❌ Missing Jira credentials in .env.develop file.');
    console.error('Please make sure JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN are set.');
    process.exit(1);
  }

  // Jira API Endpoint to get an issue by its Key
  const endpoint = `${JIRA_URL}/rest/api/2/issue/${ticketId}`;

  // Basic Auth structure for Jira Server/Cloud
  const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

  try {
    console.log(`\n🔍 Fetching Jira ticket: ${ticketId} from ${JIRA_URL}...`);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ Failed to fetch ticket. Status: ${response.status}`);
      console.error(`Error details: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    // Extracting the useful parts for our AI engine
    const summary = data.fields?.summary || 'No Summary';
    const description = data.fields?.description || 'No Description';

    console.log('\n✅ Successfully retrieved ticket data!\n');
    console.log('=========================================');
    console.log(`🎫 TICKET: ${ticketId}`);
    console.log(`📝 SUMMARY: ${summary}`);
    console.log('=========================================');
    console.log('📖 DESCRIPTION / ACCEPTANCE CRITERIA:');
    console.log(description);
    console.log('=========================================\n');
  } catch (error) {
    console.error('❌ An error occurred while fetching the Jira ticket:');
    console.error(error);
  }
}

// Get the ticket ID from the command line arguments
// e.g. npx tsx scripts/jiraFetcher.ts SCRUM-1
const ticketArg = process.argv[2];

if (!ticketArg) {
  console.error('❌ Please provide a ticket ID.');
  console.error('Usage: npm run jira:fetch -- SCRUM-1');
  process.exit(1);
}

fetchJiraTicket(ticketArg).catch(console.error);
