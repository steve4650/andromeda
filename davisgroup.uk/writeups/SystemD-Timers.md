# Living Your Best Life With SystemD Timers

## Setup

Here is a simple SystemD timer which implements a backup for your trusty Fedora
laptop.

There are two files involved as shown below. It's necessary that
`fedorabackup.service` and `fedorabackup.timer` have the same name before their
`.{service,timer}` suffixes.

File #1: `/etc/systemd/system/fedorabackup.timer`.

```
[Unit]
Description=fedora backup job

[Timer]
OnCalendar=*-*-* *:00:00

[Install]
WantedBy=timers.target
```

File #2: `/etc/systemd/system/fedorabackup.service`.

```
[Unit]
Description=fedora backup service

[Service]
Type=oneshot
ExecStart=/usr/bin/bash /home/steve/.local/bin/backup
User=steve
Group=systemd-journal
```

The contents of `/home/steve/.local/bin/backup` are as follows- notice the `-e`
argument I had to pass to `rsync` to get it to work.

```bash
#!/usr/bin/bash
/usr/bin/rsync -av -e '/usr/bin/ssh -i /home/steve/.ssh/id_ed25519' \
		--exclude Downloads \
		/home/steve/ steve@0.0.0.0:/mnt/externalssd/fedora-laptop/
```

Finally, enable the service with `sudo systemctl enable fedorabackup.timer` and
`sudo systemctl start fedorabackup.timer`.

## End result

We end up with a job which executes our `fedorabackup.sh` script every hour on
the hour.

This is quicker to do with cron, but our friend SystemD timers give us the
following improvements over cron:

- For free- your jobs will never stack on top of another! If our
  `fedorabackup.sh` script is triggered at 10:00am and ends up taking more than
  an hour to execute, upon the 11:00am timer trigger, SystemD will not execute
  `fedorabackup.sh` again on top of the 10:00am execution. This happens all the
  time with cron jobs, and can make life difficult!
- Nice logging via the command `journalctl -u fedorabackup.service`.
- Lots of SystemD fanciness- see `RandomizedDelaySec` here:
  https://www.freedesktop.org/software/systemd/man/systemd.timer.html.
- A friendly summary of your upcoming jobs via `systemctl list-timers`.

## SELinux considerations

Compare the labels of your files
`/etc/systemd/system/fedorabackup.{service,timer}` to other files in their
directory per usual.

I had to use `setsebool` to enable the SELinux booleans `rsync_client` and
`rsync_export_all_ro` to get rsync to work in this setup.
