const https = require('https');

https.get('https://api.github.com/repos/HCTsao/teachertsao/actions/runs/15610815187/jobs', {
    headers: {
        'User-Agent': 'Mozilla/5.0'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const jobsObj = JSON.parse(data);
            const failedJob = jobsObj.jobs.find(j => j.conclusion === 'failure');
            if (failedJob) {
                console.log('Failed job:', failedJob.name);
                console.log('Steps:');
                failedJob.steps.forEach(step => {
                    console.log(`  Step: ${step.name} | Status: ${step.status} | Conclusion: ${step.conclusion}`);
                });
            } else {
                console.log('No failed job found');
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log(data);
        }
    });
}).on('error', (err) => {
    console.error('HTTPS Error:', err.message);
});
