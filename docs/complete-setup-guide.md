---
sidebar_position: 2
---

# Complete Setup Guide: From Site to Working Webhook

Follow Marco's journey as he sets up a complete resource management system for his university's engineering lab.

## 👨‍💻 Meet Marco: Site Administrator

**Marco** is the IT administrator for the Politecnico Engineering Department. He's been tasked with setting up the Cloud Resource Access Control system to manage the department's new GPU clusters and networking equipment. Marco needs to create a complete setup from scratch.

**Marco's Mission**: Set up automated management for the department's new Tesla V100 GPU cluster that can be booked by research teams, with automatic network port configuration when reservations start.

---

## 🏢 Step 1: Understanding Site Management

### Site-Based Architecture

The Cloud Resource Access Control system is organized around **Sites**. Each site represents a physical location, department, or logical grouping of resources.

- **🌍 Multi-Site Support**: Organizations can have multiple sites (e.g., "Engineering Campus", "Medical Center", "Remote Lab")
- **🔒 Site Isolation**: Site administrators only see and manage their assigned site
- **👥 Independent Management**: Each site has its own administrators, resources, and configurations
- **🔗 Cross-Site Integration**: Global administrators can coordinate between sites

![Site Management](/img/sites.png)

### Marco's Site: "Polito Engineering"

Marco has been assigned as administrator for the "Polito Engineering" site, which includes:
- GPU clusters for AI research
- Network switching equipment
- High-performance workstations
- Laboratory instruments

---

## 🏗️ Step 2: Creating a Resource Type

Marco's first task is to define what types of resources his site will manage.

### Accessing Resource Type Management

1. **Login** to the system as site administrator
2. Navigate to **Administration** → **Resource Types**
3. Click **"+ Add Type"**

![Resource Type Configuration](/img/resource_type.png)

### Creating "GPU Cluster" Resource Type

Marco creates a new resource type with these specifications:

![Resource Type Configuration Form](/img/resource_type_form.png)

---

## 🖥️ Step 3: Creating the Actual Resource

Now Marco creates the specific GPU cluster that teams will book.

### Accessing Resource Management

1. Navigate to **Administration** → **Resources**
2. Click **"+ Add Resource"**
3. Select Resource Type: **"GPU Cluster"** and fill the form

![Resource Type Configuration](/img/resource_management.png)

### Resource Status

Once created, the resource appears in Marco's dashboard with:
- **🟢 Available**: Ready for booking
- **📅 Calendar Integration**: Shows on the booking calendar
- **🔗 Integration Ready**: Ready to connect webhooks

---

## 🔗 Step 4: Creating the Webhook Integration

Marco needs to connect the GPU cluster to the university's automation systems.

### Understanding Webhook Purpose

When someone books the Tesla V100 cluster, Marco wants the system to automatically:
1. **Configure network access** for the research team
2. **Provision user accounts** on the cluster
3. **Update monitoring systems** with the new reservation
4. **Send notifications** to the facility management team

### Accessing Webhook Management

From the Administration menu:
1. Click on **"WEBHOOKS"** tab in the top navigation
2. Click **"+ Add Webhook"** button

![Webhook Management](/img/webhook_management.png)

---

## ⚙️ Step 5: Webhook Configuration Walkthrough

### The Webhook Configuration Form

Marco sees an intuitive form with several sections:

![Webhook Configuration Form](/img/webhook_form.png)

- **Name**: A descriptive identifier Marco will see in logs
- **URL**: The endpoint of the university's automation server that will handle the webhook calls

### Event Type Configuration

Marco selects **"All Events"** because he wants automation for:
- **Booking Created**: Reserve network ports, prepare user accounts
- **Booking Started**: Activate access, start monitoring
- **Booking Ended**: Clean up access, archive data

### Site Selection

The dropdown shows **"Polito Engineering"** - Marco's assigned site. This ensures the webhook only triggers for resources in his department.

### Resource Selection Options

Marco has three choices:

1. **All Resources**: Would target all resources in the selected site 
2. **Specific Resource**: Would target only the selected resource  
3. **Resources by Type** ✅: Marco selects this because he wants the same automation for all future resource of type "GPU clusters"
### Saving the Configuration

Marco clicks **"Create"** and the webhook is immediately active. The platform automatically generates a shared secret that will be used to authenticate all communication between the backend service and the webhook endpoint.

![Webhook Secret](/img/webhook_secret.png)

**Important Security Note**: The shared secret ensures that only legitimate requests from the Cloud Resource Access Control system can trigger Marco's automation server. This prevents unauthorized webhook calls and maintains system security.

---

## 📊 Step 6: Testing and Monitoring

### Making a Test Booking

Marco creates a test reservation:
1. Goes to **Calendar** view
2. Press on **+ New Booking**
3. Selects resource **Tesla V100 Cluster Alpha**
4. Select the time slot
5. Adds project details
6. Press "Confirm"

![Booking Calendar](/img/booking_calendar.png)

### Watching the Webhook in Action

In the webhook logs page, Marco can access all webhooks events with the details of the REST request/response:

![Webhook Logs](/img/webhook_logs.png)

---

## 🎯 Step 7: Going Live

### Success Indicators

Marco knows the setup is working when he sees:

1. **✅ Green Success Status**: All webhook calls returning 200 OK
3. **🖥️ Cluster Ready**: SSH access works, Jupyter notebooks accessible
4. **📊 Monitoring Active**: Usage metrics appearing in monitoring dashboard

### Ongoing Management

Marco's daily routine now includes:

- **🔍 Morning Check**: Review overnight webhook activity for any failures
- **📈 Weekly Reports**: Analyze resource usage patterns for capacity planning
- **🔧 Integration Updates**: Adjust webhook configurations as automation systems evolve
- **👥 User Support**: Help research teams troubleshoot access issues

![Admin Dashboard Overview](/img/admin_dashboard.png)

---

## 🏆 Results: What Marco Achieved

### Before the System
- **Manual Process**: 2-3 hours to set up cluster access for each booking
- **Error-Prone**: Forgotten network configurations, access delays
- **No Audit Trail**: Difficult to track who used what when
- **Limited Visibility**: No real-time view of resource utilization

### After Implementation
- **🚀 Automated Setup**: 30 seconds from booking to ready cluster
- **🎯 Zero-Touch Operation**: Network, accounts, monitoring configured automatically  
- **📋 Complete Audit**: Every action logged with timestamps and success status
- **📊 Real-Time Dashboard**: Live view of all resources across the site

### User Satisfaction
- **Research Teams**: "We can focus on science instead of IT setup"
- **Marco**: "I have complete visibility and control without manual work"
- **Department Head**: "Resource utilization increased 300% with zero additional IT overhead"

---

## 🚀 Next Steps for Marco

### Expanding the System

1. **Add More Resource Types**
   - Laboratory instruments with calibration automation
   - High-memory workstations with software licensing
   - Network testing equipment with VLAN configuration

2. **Advanced Webhook Features**
   - Cost tracking integration with university billing
   - Automatic backup scheduling for long-running experiments  
   - Integration with research project management systems
   - Mail Service integration

3. **Cross-Site Collaboration**
   - Share GPU resources with other engineering departments
   - Coordinate with remote lab sites for distributed experiments
   - Implement resource borrowing between sites during peak periods

Marco has successfully transformed his department's resource management from a manual, error-prone process into a fully automated, auditable, and scalable system that serves as a model for other university departments.

---

## 📚 Key Takeaways

### For Site Administrators

1. **Start Simple**: Begin with one resource type and one webhook
2. **Test Thoroughly**: Use the monitoring dashboard to verify each step
3. **Document Everything**: Keep track of webhook endpoints and automation logic
4. **Monitor Continuously**: Regular check of webhook success rates prevents issues
5. **Scale Gradually**: Add complexity only after mastering the basics

### Technical Best Practices

1. **Webhook Design**: Make endpoints idempotent and include detailed error responses
2. **Site Isolation**: Leverage the site system for clear responsibility boundaries  
3. **Event Granularity**: Use specific events rather than "All Events" for complex automations
4. **Error Handling**: Plan for webhook failures and implement retry mechanisms
5. **Documentation**: Maintain clear documentation of all integration points

The Cloud Resource Access Control system's site-based architecture, combined with its intuitive webhook management, enables organizations to build sophisticated automation while maintaining clear administrative boundaries and comprehensive audit trails.
