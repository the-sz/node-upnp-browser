'use strict';

const express = require('express')
const app = express()
const port = 3000
const devicesFileName = 'devices.json';
const requestCount = 100;

app.use(express.static('static'))

//
// find all upnp/dlna servers and write found devices into 'devices.json'
//
app.get('/discover', (req, res) =>
{
	var devices = [];

	var UPnPControlPoint = require('node-upnp-control-point');

	var Client = require('node-ssdp').Client;

	// search for upnp devices
	var client = new Client();
	client.on('response', function inResponse(headers, code, rinfo)
	{
		//console.log(headers);
		//console.log(rinfo);

		// create device
		var device = { address: rinfo.address, xml: headers.LOCATION };

		devices.push(device);

		// get device details
		const mediaServerCP = new UPnPControlPoint(device.xml);
		mediaServerCP.getDeviceDescriptionParsed(function(err, data)
		{
			//console.log(data.description.root.device);

			device.name = data.description.root.device.friendlyName;
			device.website = data.description.root.device.presentationURL;

			device.manufacturer = data.description.root.device.manufacturer;
			device.manufacturerURL = data.description.root.device.manufacturerURL;

			device.deviceDescription = data.description.root.device.modelDescription;
			device.deviceName = data.description.root.device.modelName;
			device.deviceURL = data.description.root.device.modelURL;
			device.deviceSerialNumber = data.description.root.device.serialNumber;
			device.deviceIcon = (new URL(device.xml)).origin + data.description.root.device.iconList.icon[0].url;
		 });
	})

	client.search('urn:schemas-upnp-org:service:ContentDirectory:1');		// search for all: 'ssdp:all'

	setTimeout(function ()
	{
		client.stop();

		//console.log(devices);

		const fs = require('fs');
		fs.writeFile(devicesFileName, JSON.stringify(devices, null, 2), (err) => { });

		res.redirect('/');

	}, (5 * 1000));
})

//
// get list of detected upnp/dlna servers
//
app.get('/devices', (req, res) =>
{
	// get json from devices array
	const fs = require('fs');
	let devices = JSON.parse(fs.readFileSync(devicesFileName));

	res.json(devices);
})

//
// get a upnp/dlna folder content and return the items as json
//
app.get('/browse/:device?/:id?/:offset?', (req, res) =>
{
	var device = req.params.device;
	if (device == undefined)
		device = 0;

	var id = req.params.id;
	if (id == undefined)
		id = 0;

	var offset = req.params.offset;
	if (offset == undefined)
		offset = '0';

	// get json from devices array
	const fs = require('fs');
	let devices = JSON.parse(fs.readFileSync(devicesFileName));
	if (devices[device] != undefined)
	{
		var UPnPControlPoint = require('node-upnp-control-point');
		var mediaServerCP = new UPnPControlPoint(devices[device].xml);

		mediaServerCP.invokeActionParsed('Browse',
													{ ObjectID: id, BrowseFlag: 'BrowseDirectChildren', SortCriteria: '+dc:title', Filter: '*', StartingIndex: parseInt(offset), RequestedCount: requestCount },
													'urn:schemas-upnp-org:service:ContentDirectory:1', function(err, m)
		{
			if (m.BrowseResponse != undefined)
			{
				//console.log(m.BrowseResponse);

				var parseString = require('xml2js').parseString;
				parseString(m.BrowseResponse.Result, function (err, result)
				{
					//console.log(result);
					//console.log(result['DIDL-Lite'].container);
					//console.log(result['DIDL-Lite'].item);

					var items = [];

					if (result['DIDL-Lite'].container != undefined)
					{
						result['DIDL-Lite'].container.forEach(element =>
						{
							//console.log(element);

							items.push(	{
												id: element.$.id,
												folder: 1,
												title: element['dc:title'][0]
											});
						});
					}

					if (result['DIDL-Lite'].item != undefined)
					{
						result['DIDL-Lite'].item.forEach(element =>
						{
							//console.log(element);
							//console.log(element.res[0]);

							items.push(	{
								id: element.$.id,
								folder: 0,
								title: (element['dc:title'] || [''])[0],
								album: (element['upnp:album'] || [''])[0],
								artist: (element['upnp:artist'] || [''])[0],
								genre: (element['upnp:genre'] || [''])[0],
								trackNumber: (element['upnp:originalTrackNumber'] || [''])[0],
								url: element.res[0]['_'],
								size: element.res[0].$.size || '',
								duration: element.res[0].$.duration || ''
							});
						});
					}

					//console.log(items);
					res.json( { title: devices[device].name, requestCount: requestCount, items: items } );
				});
			}
		});
	}
})

app.listen(port, () =>
{
	console.log(`Listening on port ${port}`)
})
