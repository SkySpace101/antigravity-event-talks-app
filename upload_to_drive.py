import os
import argparse
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

# Scopes required to upload files (drive.file allows uploading and accessing files created/opened by this app)
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_credentials():
    """
    Handles standard OAuth 2.0 local authentication.
    Requires credentials.json downloaded from the Google Cloud Console.
    """
    creds = None
    # token.json stores access and refresh tokens after the first run
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    # If credentials are not valid or do not exist, run authorization flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                # Refresh failed, delete token and trigger flow
                os.remove('token.json')
                creds = None
        
        if not creds:
            if not os.path.exists('credentials.json'):
                raise FileNotFoundError(
                    "credentials.json not found. Please download OAuth client credentials "
                    "from Google Cloud Console (APIs & Services > Credentials) and place them in the root folder."
                )
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
            
        # Save credentials for future runs
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            
    return creds

def upload_file(local_filepath, drive_name=None, folder_id=None):
    """
    Uploads a file to Google Drive.
    """
    if not os.path.exists(local_filepath):
        print(f"Error: Local file '{local_filepath}' does not exist.")
        return None
        
    creds = get_credentials()
    
    try:
        # Create Google Drive service client
        service = build('drive', 'v3', credentials=creds)
        
        # Determine the name of the file on Drive
        name = drive_name if drive_name else os.path.basename(local_filepath)
        
        # Prepare file metadata
        file_metadata = {'name': name}
        if folder_id:
            file_metadata['parents'] = [folder_id]
            
        # Create media file upload handler
        media = MediaFileUpload(local_filepath, resumable=True)
        
        print(f"Uploading '{local_filepath}' as '{name}' to Google Drive...")
        
        # Perform the creation request
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        
        print("\n🎉 Upload Successful!")
        print(f"File ID: {file.get('id')}")
        print(f"Web View Link: {file.get('webViewLink')}")
        return file.get('id')
        
    except HttpError as error:
        print(f"An error occurred during API request: {error}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Upload files to Google Drive using Google Drive API v3")
    parser.add_argument("filepath", help="Path to the local file to upload")
    parser.add_argument("--name", help="Name to display on Google Drive (defaults to local file name)")
    parser.add_argument("--folder", help="Target Google Drive Folder ID (optional)")
    
    args = parser.parse_args()
    
    try:
        upload_file(args.filepath, drive_name=args.name, folder_id=args.folder)
    except FileNotFoundError as err:
        print(f"\n[Setup Error] {err}")
        print("\nSetup Steps:")
        print("1. Go to Google Cloud Console (https://console.cloud.google.com).")
        print("2. Create a project, enable 'Google Drive API'.")
        print("3. Configure OAuth Consent Screen (Internal/External) and add test users.")
        print("4. Go to Credentials > Create Credentials > OAuth client ID (Desktop app).")
        print("5. Download the client secret JSON, rename to 'credentials.json' and place it here.")
        print("\nAlso ensure python dependencies are installed:")
        print("pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
